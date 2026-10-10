using System.Security.Claims;
using MenswearStore.Api.Data;
using MenswearStore.Api.DTOs;
using MenswearStore.Api.Entities;
using MenswearStore.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

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
            UserId = userId,
            CustomerFirstName = request.FirstName.Trim(),
            CustomerLastName = request.LastName.Trim(),
            CustomerPhone = request.Phone.Trim(),
            CustomerEmail = request.Email?.Trim() ?? string.Empty,
            ShippingAddress = request.Address.Trim(),
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
        await db.SaveChangesAsync();

        var created = await LoadOrderAsync(order.Id);

        // Tell the shop owner a transfer is on its way so she knows to watch the balance.
        // Cash orders need no such warning - payment happens at the door.
        if (created!.PaymentMethod == PaymentMethod.BankTransfer)
        {
            await notifier.OrderAwaitingPaymentAsync(created);
        }

        return CreatedAtAction(nameof(GetOrder), new { id = order.Id }, created.ToDto());
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

        order.Status = request.Status;
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
        // the customer a second confirmation.
        if (wasUnpaid && order.PaymentStatus == PaymentStatus.Paid)
        {
            await notifier.PaymentConfirmedAsync(order);
        }

        return order.ToDto();
    }

    private Task<Order?> LoadOrderAsync(int id) =>
        db.Orders
            .Include(o => o.Items)
            .Include(o => o.User)
            .FirstOrDefaultAsync(o => o.Id == id);
}
