using MenswearStore.Api.Data;
using MenswearStore.Api.DTOs;
using MenswearStore.Api.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace MenswearStore.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ProductsController(ApplicationDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<ProductDto>>> GetProducts(
        GenderTarget gender = GenderTarget.Men,
        int? categoryId = null,
        bool includeInactive = false,
        string? search = null)
    {
        var query = ProductQuery().Where(product => product.GenderTarget == gender);

        if (!User.IsInRole("Admin") || !includeInactive)
        {
            query = query.Where(product => product.IsActive);
        }

        if (categoryId.HasValue)
        {
            query = query.Where(product => product.CategoryId == categoryId);
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.ToLower();
            query = query.Where(product =>
                product.Name.ToLower().Contains(term) ||
                product.Description.ToLower().Contains(term));
        }

        var products = await query.OrderByDescending(product => product.CreatedAtUtc).ToListAsync();
        return products.Select(product => product.ToDto()).ToArray();
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<ProductDto>> GetProduct(int id)
    {
        var product = await ProductQuery().FirstOrDefaultAsync(product => product.Id == id);
        if (product is null || (!product.IsActive && !User.IsInRole("Admin")))
        {
            return NotFound();
        }

        return product.ToDto();
    }

    [Authorize(Roles = "Admin")]
    [HttpPost]
    public async Task<ActionResult<ProductDto>> Create(UpsertProductRequest request)
    {
        var product = new Product();
        Apply(product, request);
        db.Products.Add(product);
        await db.SaveChangesAsync();

        var created = await ProductQuery().FirstAsync(item => item.Id == product.Id);
        return CreatedAtAction(nameof(GetProduct), new { id = product.Id }, created.ToDto());
    }

    [Authorize(Roles = "Admin")]
    [HttpPut("{id:int}")]
    public async Task<ActionResult<ProductDto>> Update(int id, UpsertProductRequest request)
    {
        var product = await ProductQuery().FirstOrDefaultAsync(product => product.Id == id);
        if (product is null)
        {
            return NotFound();
        }

        db.ProductImages.RemoveRange(product.Images);
        db.ProductSizes.RemoveRange(product.Sizes);
        db.ProductColors.RemoveRange(product.Colors);
        Apply(product, request);
        product.UpdatedAtUtc = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return product.ToDto();
    }

    [Authorize(Roles = "Admin")]
    [HttpPost("bulk-discount")]
    public async Task<ActionResult> BulkDiscount(BulkDiscountRequest request)
    {
        if (request.Percentage < 0 || request.Percentage > 100)
            return BadRequest(new { message = "Percentage must be between 0 and 100." });

        var products = await db.Products
            .Where(p => request.ProductIds.Contains(p.Id))
            .ToListAsync();

        foreach (var product in products)
        {
            product.DiscountPrice = request.Percentage == 0
                ? null
                : Math.Round(product.Price * (1 - request.Percentage / 100m), 2);
            product.UpdatedAtUtc = DateTime.UtcNow;
        }

        await db.SaveChangesAsync();
        return Ok(new { updated = products.Count });
    }

    [Authorize(Roles = "Admin")]
    [HttpDelete("{id:int}")]
    public async Task<ActionResult> Delete(int id)
    {
        var product = await db.Products.FindAsync(id);
        if (product is null)
        {
            return NotFound();
        }

        product.IsActive = false;
        product.UpdatedAtUtc = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return NoContent();
    }

    private IQueryable<Product> ProductQuery() =>
        db.Products
            .Include(product => product.Category)
            .Include(product => product.Images)
            .Include(product => product.Sizes)
            .Include(product => product.Colors);

    private static void Apply(Product product, UpsertProductRequest request)
    {
        product.Name = request.Name.Trim();
        product.Description = request.Description.Trim();
        product.Price = request.Price;
        product.DiscountPrice = request.DiscountPrice;
        product.CategoryId = request.CategoryId;
        product.GenderTarget = request.GenderTarget;
        product.StockQuantity = request.StockQuantity;
        product.IsActive = request.IsActive;
        product.Sizes = request.Sizes.Where(size => !string.IsNullOrWhiteSpace(size))
            .Select(size => new ProductSize { Name = size.Trim() }).ToList();
        product.Colors = request.Colors.Select(color => new ProductColor { Name = color.Name.Trim(), HexCode = color.HexCode }).ToList();
        product.Images = request.Images.Select(image => new ProductImage
        {
            Url = image.Url.Trim(),
            AltText = image.AltText.Trim(),
            IsPrimary = image.IsPrimary,
            SortOrder = image.SortOrder
        }).ToList();
    }
}
