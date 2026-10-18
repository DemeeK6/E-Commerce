using MenswearStore.Api.Data;
using MenswearStore.Api.DTOs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace MenswearStore.Api.Controllers;

[ApiController]
[Authorize(Roles = "Admin")]
[Route("api/admin")]
public class AdminController(ApplicationDbContext db) : ControllerBase
{
    [HttpGet("dashboard")]
    public async Task<ActionResult> Dashboard()
    {
        var productCount = await db.Products.CountAsync();
        var activeProducts = await db.Products.CountAsync(product => product.IsActive);
        var categoryCount = await db.Categories.CountAsync();
        var carts = await db.Carts.CountAsync();
        var orderCount = await db.Orders.CountAsync();
        var pendingOrders = await db.Orders.CountAsync(order => order.Status == "Pending");
        var togglesEnabled = await db.AppSettings.CountAsync(setting => setting.IsEnabled);

        return Ok(new { productCount, activeProducts, categoryCount, carts, orderCount, pendingOrders, togglesEnabled });
    }

    [HttpGet("orders")]
    public async Task<ActionResult<OrderDto[]>> Orders()
    {
        var orders = await db.Orders
            .Include(o => o.Items)
            .Include(o => o.User)
            .OrderByDescending(o => o.CreatedAtUtc)
            .ToListAsync();
        return orders.Select(o => o.ToDto()).ToArray();
    }
}
