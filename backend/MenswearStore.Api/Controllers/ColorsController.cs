using MenswearStore.Api.Data;
using MenswearStore.Api.DTOs;
using MenswearStore.Api.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Text.RegularExpressions;

namespace MenswearStore.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ColorsController(ApplicationDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<ColorDto>>> Get(bool includeDisabled = false)
    {
        var query = db.Colors.AsQueryable();
        if (!User.IsInRole("Admin") || !includeDisabled)
        {
            query = query.Where(color => color.IsEnabled);
        }

        var colors = await query.OrderBy(color => color.DisplayOrder).ToListAsync();
        return colors.Select(color => color.ToDto()).ToArray();
    }

    [Authorize(Roles = "Admin")]
    [HttpPost]
    public async Task<ActionResult<ColorDto>> Create(UpsertColorRequest request)
    {
        var validationError = await ValidateNameAsync(request, id: null);
        if (validationError is not null)
        {
            return BadRequest(new { message = validationError });
        }

        var color = new Color();
        Apply(color, request);
        db.Colors.Add(color);
        await db.SaveChangesAsync();
        return CreatedAtAction(nameof(Get), new { id = color.Id }, color.ToDto());
    }

    [Authorize(Roles = "Admin")]
    [HttpPut("{id:int}")]
    public async Task<ActionResult<ColorDto>> Update(int id, UpsertColorRequest request)
    {
        var color = await db.Colors.FindAsync(id);
        if (color is null)
        {
            return NotFound();
        }

        var validationError = await ValidateNameAsync(request, id);
        if (validationError is not null)
        {
            return BadRequest(new { message = validationError });
        }

        Apply(color, request);
        await db.SaveChangesAsync();
        return color.ToDto();
    }

    [Authorize(Roles = "Admin")]
    [HttpDelete("{id:int}")]
    public async Task<ActionResult> Delete(int id)
    {
        var color = await db.Colors.FindAsync(id);
        if (color is null)
        {
            return NotFound();
        }

        color.IsEnabled = false;
        await db.SaveChangesAsync();
        return NoContent();
    }

    private static readonly Regex HexCodePattern = new(@"^#[0-9a-fA-F]{6}$", RegexOptions.Compiled);

    private async Task<string?> ValidateNameAsync(UpsertColorRequest request, int? id)
    {
        var name = request.NameEn.Trim();
        if (string.IsNullOrWhiteSpace(name))
        {
            return "NameEn is required.";
        }

        var duplicate = await db.Colors.AnyAsync(existing =>
            existing.Id != (id ?? 0) && existing.NameEn.ToLower() == name.ToLower());
        if (duplicate)
        {
            return $"A colour named \"{name}\" already exists.";
        }

        if (!HexCodePattern.IsMatch(request.HexCode.Trim()))
        {
            return $"HexCode \"{request.HexCode}\" is not a valid colour (expected format #RRGGBB).";
        }

        return null;
    }

    private static void Apply(Color color, UpsertColorRequest request)
    {
        color.NameEn = request.NameEn.Trim();
        color.NameKa = request.NameKa.Trim();
        color.NameRu = request.NameRu.Trim();
        color.HexCode = request.HexCode.Trim();
        color.DisplayOrder = request.DisplayOrder;
        color.IsEnabled = request.IsEnabled;
    }
}
