using System.Security.Claims;
using MenswearStore.Api.Data;
using MenswearStore.Api.DTOs;
using MenswearStore.Api.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace MenswearStore.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class OrdersController(ApplicationDbContext db) : ControllerBase
{
    private static readonly string[] ValidStatuses =
        ["Pending", "Processing", "Shipped", "Delivered", "Cancelled"];

    [HttpPost]
    public async Task<ActionResult<OrderDto>> Create(CreateOrderRequest request)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
        var cart = await db.Carts
            .Include(c => c.Items).ThenInclude(i => i.Product)
            .FirstOrDefaultAsync(c => c.UserId == userId);

        if (cart is null || !cart.Items.Any())
            return BadRequest(new { message = "Cart is empty." });

        var order = new Order
        {
            UserId = userId,
            Status = "Pending",
            Total = cart.Items.Sum(i => i.UnitPrice * i.Quantity),
            Items = cart.Items.Select(i => new OrderItem
            {
                ProductId = i.ProductId,
                ProductName = i.Product?.Name ?? "Product",
                Quantity = i.Quantity,
                UnitPrice = i.UnitPrice,
                Size = i.Size ?? string.Empty,
                Color = i.Color ?? string.Empty,
            }).ToList()
        };

        db.Orders.Add(order);
        db.CartItems.RemoveRange(cart.Items);
        await db.SaveChangesAsync();

        var created = await LoadOrderAsync(order.Id);
        return CreatedAtAction(nameof(GetOrder), new { id = order.Id }, created!.ToDto());
    }

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

    private Task<Order?> LoadOrderAsync(int id) =>
        db.Orders
            .Include(o => o.Items)
            .Include(o => o.User)
            .FirstOrDefaultAsync(o => o.Id == id);
}
