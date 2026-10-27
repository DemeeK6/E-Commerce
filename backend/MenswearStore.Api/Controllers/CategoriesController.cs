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

        var categories = await query.OrderBy(category => category.DisplayOrder).ToListAsync();
        return categories.Select(category => category.ToDto()).ToArray();
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
    public async Task<ActionResult> Delete(int id)
    {
        var category = await db.Categories.FindAsync(id);
        if (category is null)
        {
            return NotFound();
        }

        // Products -> Categories is declared onDelete: Cascade, so removing a category
        // that still holds products would take the products with it without warning.
        // Refuse and say how many, so the owner moves them first. Hiding a category
        // without deleting it is what the enable/disable toggle is for.
        var productCount = await db.Products.CountAsync(product => product.CategoryId == id);
        if (productCount > 0)
        {
            return BadRequest(new
            {
                message = $"\"{category.NameEn}\" still has {productCount} product(s). "
                        + "Move them to another category first, or disable this one instead of deleting it."
            });
        }

        db.Categories.Remove(category);
        await db.SaveChangesAsync();
        return NoContent();
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
