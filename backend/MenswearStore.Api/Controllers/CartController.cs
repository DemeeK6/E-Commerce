using System.Security.Claims;
using MenswearStore.Api.Data;
using MenswearStore.Api.DTOs;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace MenswearStore.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class CartController(ApplicationDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<CartDto>> Get([FromQuery] string? guestId)
    {
        var cart = await FindOrCreateCartAsync(guestId);
        return cart.ToDto();
    }

    [HttpPost("items")]
    public async Task<ActionResult<CartDto>> AddItem(AddCartItemRequest request)
    {
        if (request.Quantity < 1)
        {
            return BadRequest(new { message = "Quantity must be at least 1." });
        }

        var product = await db.Products.Include(item => item.Images)
            .FirstOrDefaultAsync(item => item.Id == request.ProductId && item.IsActive);
        if (product is null)
        {
            return NotFound(new { message = "Product not found." });
        }

        var cart = await FindOrCreateCartAsync(request.GuestId);
        var unitPrice = product.DiscountPrice ?? product.Price;
        var item = cart.Items.FirstOrDefault(existing =>
            existing.ProductId == request.ProductId &&
            existing.Size == request.Size &&
            existing.Color == request.Color);

        if (item is null)
        {
            cart.Items.Add(new Entities.CartItem
            {
                ProductId = request.ProductId,
                Quantity = request.Quantity,
                Size = request.Size,
                Color = request.Color,
                UnitPrice = unitPrice
            });
        }
        else
        {
            item.Quantity += request.Quantity;
            item.UnitPrice = unitPrice;
        }

        cart.UpdatedAtUtc = DateTime.UtcNow;
        await db.SaveChangesAsync();
        cart = await LoadCartAsync(cart.Id);
        return cart.ToDto();
    }

    [HttpPut("items/{id:int}")]
    public async Task<ActionResult<CartDto>> UpdateItem(int id, UpdateCartItemRequest request)
    {
        var cart = await FindOrCreateCartAsync(request.GuestId);
        var item = cart.Items.FirstOrDefault(item => item.Id == id);
        if (item is null)
        {
            return NotFound();
        }

        if (request.Quantity <= 0)
        {
            db.CartItems.Remove(item);
        }
        else
        {
            item.Quantity = request.Quantity;
        }

        cart.UpdatedAtUtc = DateTime.UtcNow;
        await db.SaveChangesAsync();
        cart = await LoadCartAsync(cart.Id);
        return cart.ToDto();
    }

    [HttpDelete("items/{id:int}")]
    public async Task<ActionResult<CartDto>> DeleteItem(int id, [FromQuery] string? guestId)
    {
        var cart = await FindOrCreateCartAsync(guestId);
        var item = cart.Items.FirstOrDefault(item => item.Id == id);
        if (item is null)
        {
            return NotFound();
        }

        db.CartItems.Remove(item);
        cart.UpdatedAtUtc = DateTime.UtcNow;
        await db.SaveChangesAsync();
        cart = await LoadCartAsync(cart.Id);
        return cart.ToDto();
    }

    private async Task<Entities.Cart> FindOrCreateCartAsync(string? guestId)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        var query = db.Carts.Include(cart => cart.Items)
            .ThenInclude(item => item.Product)
            .ThenInclude(product => product!.Images)
            .AsQueryable();

        var cart = userId is not null
            ? await query.FirstOrDefaultAsync(item => item.UserId == userId)
            : await query.FirstOrDefaultAsync(item => item.GuestId == guestId);

        if (cart is not null)
        {
            return cart;
        }

        cart = new Entities.Cart
        {
            UserId = userId,
            GuestId = userId is null ? guestId : null
        };
        db.Carts.Add(cart);
        await db.SaveChangesAsync();
        return await LoadCartAsync(cart.Id);
    }

    private Task<Entities.Cart> LoadCartAsync(int cartId) =>
        db.Carts.Include(cart => cart.Items)
            .ThenInclude(item => item.Product)
            .ThenInclude(product => product!.Images)
            .FirstAsync(cart => cart.Id == cartId);
}
