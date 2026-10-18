using System.Net.Mail;
using System.Security.Claims;
using MenswearStore.Api.Data;
using MenswearStore.Api.DTOs;
using MenswearStore.Api.Entities;
using MenswearStore.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace MenswearStore.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class OrdersController(ApplicationDbContext db, IOrderNotifier notifier) : ControllerBase
{
    private static readonly string[] ValidStatuses =
        ["Pending", "Processing", "Shipped", "Delivered", "Cancelled"];

    /// <summary>
    /// Places an order. Deliberately anonymous: guests may check out without an account.
    /// When a valid token is present the order is linked to that account as well.
    /// </summary>
    [AllowAnonymous]
    [HttpPost]
    public async Task<ActionResult<OrderDto>> Create(CreateOrderRequest request)
    {
        if (request.Items is null || request.Items.Length == 0)
            return BadRequest(new { message = "Cart is empty." });

        if (string.IsNullOrWhiteSpace(request.FirstName) ||
            string.IsNullOrWhiteSpace(request.LastName) ||
            string.IsNullOrWhiteSpace(request.Phone) ||
            string.IsNullOrWhiteSpace(request.Address))
        {
            return BadRequest(new { message = "First name, last name, phone and address are required." });
        }

        // Every order email goes here, so a missing or mistyped address means the
        // customer never hears about their order.
        if (string.IsNullOrWhiteSpace(request.Email) || !MailAddress.TryCreate(request.Email.Trim(), out _))
            return BadRequest(new { message = "A valid email address is required." });

        if (request.Items.Any(item => item.Quantity <= 0))
            return BadRequest(new { message = "Quantity must be at least 1." });

        // The shop owner confirms transfers by checking a balance, so she has to know
        // which bank to look in.
        if (request.PaymentMethod == PaymentMethod.BankTransfer && request.TransferBank is null)
            return BadRequest(new { message = "Choose the bank you will transfer from." });

        var productIds = request.Items.Select(item => item.ProductId).Distinct().ToArray();
        var products = await db.Products
            .Where(product => productIds.Contains(product.Id) && product.IsActive)
            .ToDictionaryAsync(product => product.Id);

        var missing = productIds.Where(id => !products.ContainsKey(id)).ToArray();
        if (missing.Length > 0)
            return BadRequest(new { message = "Unavailable product(s): " + string.Join(", ", missing) });

        // The browser never sends a price. Every line is priced from the product row here, so a
        // tampered request cannot decide what it pays.
        var items = request.Items.Select(item =>
        {
            var product = products[item.ProductId];
            return new OrderItem
            {
                ProductId = product.Id,
                ProductName = product.Name,
                Quantity = item.Quantity,
                UnitPrice = product.DiscountPrice ?? product.Price,
                Size = item.Size?.Trim() ?? string.Empty,
                Color = item.Color?.Trim() ?? string.Empty,
            };
        }).ToList();

        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);

        var order = new Order
        {
            OrderNumber = await OrderNumberGenerator.NextAsync(db),
            UserId = userId,
            CustomerFirstName = request.FirstName.Trim(),
            CustomerLastName = request.LastName.Trim(),
            CustomerPhone = request.Phone.Trim(),
            CustomerEmail = request.Email?.Trim() ?? string.Empty,
            ShippingAddress = request.Address.Trim(),
            Language = request.Language is "ka" or "ru" ? request.Language : "en",
            PaymentMethod = request.PaymentMethod,
            // Only meaningful for transfers; a cash order must not carry a stale bank.
            TransferBank = request.PaymentMethod == PaymentMethod.BankTransfer ? request.TransferBank : null,
            // Cash and bank transfer both settle after the fact; the shop owner marks the order
            // paid. A card gateway would move this to Paid from its webhook instead.
            PaymentStatus = PaymentStatus.Pending,
            Status = "Pending",
            Total = items.Sum(item => item.UnitPrice * item.Quantity),
            Items = items,
        };

        db.Orders.Add(order);
        await SaveWithFreeOrderNumberAsync(order);

        var created = await LoadOrderAsync(order.Id);

        // A cash order is final now, so the shop owner and the customer hear about it.
        // A transfer deliberately waits: the order exists only so the customer has a
        // number to quote in the transfer description. Both emails go out when they
        // confirm, so nobody is told about an order abandoned on the instructions screen.
        if (order.PaymentMethod == PaymentMethod.Cash)
        {
            await notifier.CashOrderPlacedAsync(created!);
        }

        return CreatedAtAction(nameof(GetOrder), new { id = order.Id }, created!.ToDto());
    }

    [Authorize]
    [HttpGet]
    public async Task<ActionResult<OrderDto[]>> List()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
        var orders = await db.Orders
            .Include(o => o.Items)
            .Include(o => o.User)
            .Where(o => o.UserId == userId)
            .OrderByDescending(o => o.CreatedAtUtc)
            .ToListAsync();
        return orders.Select(o => o.ToDto()).ToArray();
    }

    [Authorize]
    [HttpGet("{id:int}")]
    public async Task<ActionResult<OrderDto>> GetOrder(int id)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
        var isAdmin = User.IsInRole("Admin");
        var order = await LoadOrderAsync(id);

        if (order is null || (!isAdmin && order.UserId != userId))
            return NotFound();

        return order.ToDto();
    }

    [Authorize(Roles = "Admin")]
    [HttpPut("{id:int}/status")]
    public async Task<ActionResult<OrderDto>> UpdateStatus(int id, UpdateOrderStatusRequest request)
    {
        if (!ValidStatuses.Contains(request.Status))
            return BadRequest(new { message = "Invalid status. Valid values: " + string.Join(", ", ValidStatuses) });

        var order = await LoadOrderAsync(id);
        if (order is null) return NotFound();

        var changed = order.Status != request.Status;
        order.Status = request.Status;
        await db.SaveChangesAsync();

        // Only on a real change, so re-saving the same status does not email the customer
        // twice. The notifier itself ignores statuses the customer need not hear about.
        if (changed)
        {
            await notifier.StatusChangedAsync(order);
        }

        return order.ToDto();
    }

    /// <summary>
    /// The customer says they have sent the transfer. Anonymous because guests check out
    /// without an account; the token proves they are the one who placed this order.
    /// </summary>
    [AllowAnonymous]
    [HttpPost("{id:int}/confirm-transfer")]
    public async Task<ActionResult<OrderDto>> ConfirmTransfer(int id, OrderTokenRequest request)
    {
        var order = await LoadOrderAsync(id);
        if (order is null || order.PublicToken != request.PublicToken) return NotFound();

        if (order.Status == "Cancelled")
            return BadRequest(new { message = "This order was cancelled." });

        // Idempotent: a double submit must not send the shop owner a second email.
        if (order.CustomerConfirmedPaymentAtUtc is null)
        {
            order.CustomerConfirmedPaymentAtUtc = DateTime.UtcNow;
            await db.SaveChangesAsync();
            await notifier.OrderAwaitingPaymentAsync(order);
        }

        return order.ToDto();
    }

    /// <summary>
    /// The customer backed out at the instructions screen. The order is kept as Cancelled
    /// rather than deleted, so a payment that arrives anyway still has something to match.
    /// </summary>
    [AllowAnonymous]
    [HttpPost("{id:int}/cancel")]
    public async Task<ActionResult<OrderDto>> CancelByCustomer(int id, OrderTokenRequest request)
    {
        var order = await LoadOrderAsync(id);
        if (order is null || order.PublicToken != request.PublicToken) return NotFound();

        // Once money has actually arrived, only the shop owner may unwind the order.
        if (order.PaymentStatus == PaymentStatus.Paid)
            return BadRequest(new { message = "This order is already paid. Please contact the shop." });

        order.Status = "Cancelled";
        await db.SaveChangesAsync();
        return order.ToDto();
    }

    /// <summary>
    /// Settles payment for an order. Used by the shop owner for cash and bank transfers today;
    /// a payment gateway's webhook would call the same transition.
    /// </summary>
    [Authorize(Roles = "Admin")]
    [HttpPut("{id:int}/payment")]
    public async Task<ActionResult<OrderDto>> UpdatePayment(int id, UpdatePaymentStatusRequest request)
    {
        var order = await LoadOrderAsync(id);
        if (order is null) return NotFound();

        var wasUnpaid = order.PaymentStatus != PaymentStatus.Paid;

        order.PaymentStatus = request.PaymentStatus;
        if (!string.IsNullOrWhiteSpace(request.PaymentReference))
            order.PaymentReference = request.PaymentReference.Trim();

        await db.SaveChangesAsync();

        // Only on the transition into Paid, so re-saving a paid order cannot send
        // the customer a second confirmation. Bank transfers only: a cash order is
        // paid at the door, where "we will be in touch about delivery" makes no sense.
        if (wasUnpaid && order.PaymentStatus == PaymentStatus.Paid
            && order.PaymentMethod == PaymentMethod.BankTransfer)
        {
            await notifier.PaymentConfirmedAsync(order);
        }

        return order.ToDto();
    }

    /// <summary>
    /// The generator checks a number is free before using it, but two orders placed in
    /// the same instant could still pick the same one. The unique index then rejects
    /// the second save; instead of showing the customer an error, take a new number
    /// and save again.
    /// </summary>
    private async Task SaveWithFreeOrderNumberAsync(Order order)
    {
        for (var attempt = 1; ; attempt++)
        {
            try
            {
                await db.SaveChangesAsync();
                return;
            }
            catch (DbUpdateException exception) when (
                attempt < 5 &&
                exception.InnerException is PostgresException
                {
                    SqlState: PostgresErrorCodes.UniqueViolation,
                    ConstraintName: "IX_Orders_OrderNumber"
                })
            {
                order.OrderNumber = await OrderNumberGenerator.NextAsync(db);
            }
        }
    }

    private Task<Order?> LoadOrderAsync(int id) =>
        db.Orders
            .Include(o => o.Items)
            .Include(o => o.User)
            .FirstOrDefaultAsync(o => o.Id == id);
}
