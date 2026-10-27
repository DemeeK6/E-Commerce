using MenswearStore.Api.Data;
using MenswearStore.Api.DTOs;
using MenswearStore.Api.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace MenswearStore.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class CategoriesController(ApplicationDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<CategoryDto>>> Get(GenderTarget? gender = null, bool includeDisabled = false)
    {
        var query = db.Categories.AsQueryable();
        if (gender.HasValue)
        {
            query = query.Where(category => category.GenderTarget == gender);
        }

        if (!User.IsInRole("Admin") || !includeDisabled)
        {
            query = query.Where(category => category.IsEnabled);
        }

        var categories = await query
            .OrderBy(category => category.DisplayOrder)
            .Select(category => new { Category = category, ProductCount = category.Products.Count() })
            .ToListAsync();

        return categories
            .Select(row => row.Category.ToDto() with { ProductCount = row.ProductCount })
            .ToArray();
    }

    [Authorize(Roles = "Admin")]
    [HttpPost]
    public async Task<ActionResult<CategoryDto>> Create(UpsertCategoryRequest request)
    {
        var category = new Category();
        Apply(category, request);
        db.Categories.Add(category);
        try
        {
            await db.SaveChangesAsync();
        }
        catch (DbUpdateException)
        {
            return BadRequest(new { message = $"A category with slug \"{category.Slug}\" already exists." });
        }

        return CreatedAtAction(nameof(Get), new { id = category.Id }, category.ToDto());
    }

    [Authorize(Roles = "Admin")]
    [HttpPut("{id:int}")]
    public async Task<ActionResult<CategoryDto>> Update(int id, UpsertCategoryRequest request)
    {
        var category = await db.Categories.FindAsync(id);
        if (category is null)
        {
            return NotFound();
        }

        Apply(category, request);
        try
        {
            await db.SaveChangesAsync();
        }
        catch (DbUpdateException)
        {
            return BadRequest(new { message = $"A category with slug \"{category.Slug}\" already exists." });
        }

        return category.ToDto();
    }

    [Authorize(Roles = "Admin")]
    [HttpDelete("{id:int}")]
    /// <param name="moveProductsTo">
    /// Where to send the products this category still holds. Required when it holds any:
    /// Products -> Categories is declared onDelete: Cascade, so deleting without moving
    /// them would take the products with it and never say so.
    /// </param>
    public async Task<ActionResult> Delete(int id, int? moveProductsTo = null)
    {
        var category = await db.Categories.FindAsync(id);
        if (category is null)
        {
            return NotFound();
        }

        var products = await db.Products.Where(product => product.CategoryId == id).ToListAsync();

        if (products.Count > 0)
        {
            if (moveProductsTo is null)
            {
                return BadRequest(new
                {
                    message = $"\"{category.NameEn}\" still has {products.Count} product(s). "
                            + "Choose a category to move them to."
                });
            }

            if (moveProductsTo == id)
            {
                return BadRequest(new { message = "Products cannot be moved into the category being deleted." });
            }

            var destination = await db.Categories.FindAsync(moveProductsTo.Value);
            if (destination is null)
            {
                return BadRequest(new { message = "The category to move the products to no longer exists." });
            }

            foreach (var product in products)
            {
                product.CategoryId = destination.Id;
                // A product's gender follows its category - see ProductsController.Apply.
                // Leaving it behind would put a Men product in a Women category.
                product.GenderTarget = destination.GenderTarget;
            }
        }

        db.Categories.Remove(category);
        await db.SaveChangesAsync();
        return Ok(new { moved = products.Count });
    }

    /// <summary>
    /// The slug follows the English name and the gender, and is never supplied by the
    /// caller. Editing used to leave the old slug in place, so renaming a category or
    /// moving it to another gender left a slug describing what it no longer was - and
    /// a Women category could end up owning the bare "shirts" slug that Men needed.
    /// Men keeps the bare slug; Women and Kids are prefixed, matching the seeder.
    /// </summary>
    private static string BuildSlug(string nameEn, GenderTarget gender)
    {
        var prefix = gender switch
        {
            GenderTarget.Women => "women-",
            GenderTarget.Kids => "kids-",
            _ => string.Empty
        };

        var body = new string(nameEn.Trim().ToLowerInvariant()
            .Select(character => char.IsLetterOrDigit(character) ? character : '-')
            .ToArray());

        while (body.Contains("--"))
        {
            body = body.Replace("--", "-");
        }

        return prefix + body.Trim('-');
    }

    private static void Apply(Category category, UpsertCategoryRequest request)
    {
        category.NameEn = request.NameEn.Trim();
        category.NameKa = request.NameKa.Trim();
        // Russian is no longer edited in the admin; keep any stored text unless one is sent.
        if (request.NameRu is not null) category.NameRu = request.NameRu.Trim();
        category.Slug = BuildSlug(request.NameEn, request.GenderTarget);
        category.GenderTarget = request.GenderTarget;
        category.IsEnabled = request.IsEnabled;
        category.DisplayOrder = request.DisplayOrder;
    }
}
