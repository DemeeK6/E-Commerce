using MenswearStore.Api.Data;
using MenswearStore.Api.DTOs;
using MenswearStore.Api.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace MenswearStore.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ProductsController(
    ApplicationDbContext db,
    IWebHostEnvironment env,
    ILogger<ProductsController> logger) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<ProductDto>>> GetProducts(
        GenderTarget? gender = null,
        int? categoryId = null,
        bool includeInactive = false,
        string? search = null)
    {
        var query = ProductQuery();

        if (gender.HasValue)
        {
            query = query.Where(product => product.GenderTarget == gender);
        }

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
        var colorError = await ValidateColorIdsAsync(request);
        if (colorError is not null)
        {
            return BadRequest(new { message = colorError });
        }

        var category = await db.Categories.FindAsync(request.CategoryId);
        if (category is null)
        {
            return BadRequest(new { message = $"Unknown CategoryId: {request.CategoryId}." });
        }

        var product = new Product();
        Apply(product, request, category);
        db.Products.Add(product);
        await db.SaveChangesAsync();

        var created = await ProductQuery().FirstAsync(item => item.Id == product.Id);
        return CreatedAtAction(nameof(GetProduct), new { id = product.Id }, created.ToDto());
    }

    [Authorize(Roles = "Admin")]
    [HttpPut("{id:int}")]
    public async Task<ActionResult<ProductDto>> Update(int id, UpsertProductRequest request)
    {
        var colorError = await ValidateColorIdsAsync(request);
        if (colorError is not null)
        {
            return BadRequest(new { message = colorError });
        }

        var category = await db.Categories.FindAsync(request.CategoryId);
        if (category is null)
        {
            return BadRequest(new { message = $"Unknown CategoryId: {request.CategoryId}." });
        }

        var product = await ProductQuery().FirstOrDefaultAsync(product => product.Id == id);
        if (product is null)
        {
            return NotFound();
        }

        db.ProductImages.RemoveRange(product.Images);
        db.ProductSizes.RemoveRange(product.Sizes);
        db.ProductColors.RemoveRange(product.Colors);
        Apply(product, request, category);
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

        // Sizes, colours, photo rows and cart lines go with the product; past order
        // lines are only unlinked (see ApplicationDbContext).
        var imageUrls = await db.ProductImages
            .Where(image => image.ProductId == id)
            .Select(image => image.Url)
            .ToListAsync();

        db.Products.Remove(product);
        await db.SaveChangesAsync();

        await DeleteUnusedUploadsAsync(imageUrls);
        return NoContent();
    }

    /// <summary>
    /// Turns a product on or off in the shop without deleting anything. Hidden products
    /// stay in the admin list and keep their photos.
    /// </summary>
    [Authorize(Roles = "Admin")]
    [HttpPut("{id:int}/active")]
    public async Task<ActionResult<ProductDto>> SetActive(int id, SetProductActiveRequest request)
    {
        var product = await db.Products.FindAsync(id);
        if (product is null)
        {
            return NotFound();
        }

        product.IsActive = request.IsActive;
        product.UpdatedAtUtc = DateTime.UtcNow;
        await db.SaveChangesAsync();

        var updated = await ProductQuery().FirstAsync(item => item.Id == id);
        return updated.ToDto();
    }

    /// <summary>
    /// Removes a deleted product's uploaded photo files, unless another product or the
    /// home page banner still shows the same file. Best effort: a file that cannot be
    /// removed only wastes disk space, so it never fails the delete.
    /// </summary>
    private async Task DeleteUnusedUploadsAsync(IEnumerable<string> urls)
    {
        var uploadsDir = Path.GetFullPath(Path.Combine(env.WebRootPath ?? env.ContentRootPath, "uploads"));

        foreach (var url in urls.Where(url => url.StartsWith("/uploads/", StringComparison.Ordinal)).Distinct())
        {
            var stillUsed = await db.ProductImages.AnyAsync(image => image.Url == url)
                || await db.HeroSlides.AnyAsync(slide => slide.ImageUrl == url);
            if (stillUsed) continue;

            // Only plain file names inside the uploads folder - never a path that climbs out of it.
            var path = Path.GetFullPath(Path.Combine(uploadsDir, Path.GetFileName(url)));
            if (!path.StartsWith(uploadsDir, StringComparison.Ordinal)) continue;

            try
            {
                System.IO.File.Delete(path);
            }
            catch (Exception exception) when (exception is IOException or UnauthorizedAccessException)
            {
                logger.LogWarning(exception, "Could not delete unused upload {Path}.", path);
            }
        }
    }

    private IQueryable<Product> ProductQuery() =>
        db.Products
            .Include(product => product.Category)
            .Include(product => product.Images)
            .Include(product => product.Sizes)
            .Include(product => product.Colors).ThenInclude(color => color.Color);

    private static void Apply(Product product, UpsertProductRequest request, Category category)
    {
        product.Name = request.Name.Trim();
        product.Description = request.Description.Trim();
        product.Price = request.Price;
        product.DiscountPrice = request.DiscountPrice;
        product.CategoryId = category.Id;
        product.GenderTarget = category.GenderTarget;
        product.IsActive = request.IsActive;
        product.Sizes = request.Sizes.Where(size => !string.IsNullOrWhiteSpace(size))
            .Select(size => new ProductSize { Name = size.Trim() }).ToList();

        // A colour attached to an image is, by definition, a colour this product comes in.
        // Union the two so the shop owner cannot tag a photo "Black" yet leave Black
        // unselectable on the storefront - the product form offers them as separate
        // controls, and keeping them in step by hand is a trap.
        var colorIds = request.Colors.Select(colorInput => colorInput.ColorId)
            .Concat(request.Images.Where(image => image.ColorId.HasValue).Select(image => image.ColorId!.Value))
            .Distinct()
            .ToArray();

        product.Colors = colorIds
            .Select(colorId => new ProductColor { ColorId = colorId })
            .ToList();

        product.Images = request.Images.Select(image => new ProductImage
        {
            Url = image.Url.Trim(),
            AltText = image.AltText.Trim(),
            IsPrimary = image.IsPrimary,
            SortOrder = image.SortOrder,
            ColorId = image.ColorId
        }).ToList();
    }

    private async Task<string?> ValidateColorIdsAsync(UpsertProductRequest request)
    {
        var requestedIds = request.Colors.Select(color => color.ColorId)
            .Concat(request.Images.Where(image => image.ColorId.HasValue).Select(image => image.ColorId!.Value))
            .Distinct()
            .ToArray();

        if (requestedIds.Length == 0)
        {
            return null;
        }

        var existingIds = await db.Colors
            .Where(color => requestedIds.Contains(color.Id))
            .Select(color => color.Id)
            .ToListAsync();

        var missing = requestedIds.Except(existingIds).ToArray();
        if (missing.Length > 0)
        {
            return $"Unknown ColorId(s): {string.Join(", ", missing)}.";
        }

        return null;
    }
}
