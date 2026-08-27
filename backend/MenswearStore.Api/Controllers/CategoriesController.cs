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
        await db.SaveChangesAsync();
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
        await db.SaveChangesAsync();
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

        category.IsEnabled = false;
        await db.SaveChangesAsync();
        return NoContent();
    }

    private static void Apply(Category category, UpsertCategoryRequest request)
    {
        category.NameEn = request.NameEn.Trim();
        category.NameKa = request.NameKa.Trim();
        category.NameRu = request.NameRu.Trim();
        category.Slug = request.Slug.Trim().ToLowerInvariant();
        category.GenderTarget = request.GenderTarget;
        category.IsEnabled = request.IsEnabled;
        category.DisplayOrder = request.DisplayOrder;
    }
}
