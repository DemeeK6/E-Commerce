using MenswearStore.Api.Data;
using MenswearStore.Api.DTOs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace MenswearStore.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class InfoSectionsController(ApplicationDbContext db) : ControllerBase
{
    /// <summary>
    /// Anonymous: the Info page is public. Disabled sections are hidden from shoppers
    /// and only returned to an admin who explicitly asks, matching categories and colours.
    /// </summary>
    [AllowAnonymous]
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<InfoSectionDto>>> Get(bool includeDisabled = false)
    {
        var query = db.InfoSections.AsQueryable();
        if (!User.IsInRole("Admin") || !includeDisabled)
        {
            query = query.Where(section => section.IsEnabled);
        }

        var sections = await query.OrderBy(section => section.DisplayOrder).ToListAsync();
        return sections.Select(section => section.ToDto()).ToArray();
    }

    [Authorize(Roles = "Admin")]
    [HttpPut("{id:int}")]
    public async Task<ActionResult<InfoSectionDto>> Update(int id, UpsertInfoSectionRequest request)
    {
        var section = await db.InfoSections.FindAsync(id);
        if (section is null) return NotFound();

        if (string.IsNullOrWhiteSpace(request.TitleEn) || string.IsNullOrWhiteSpace(request.BodyEn))
        {
            // English is the fallback every other language resolves to, so it cannot be blank.
            return BadRequest(new { message = "The English title and text are required." });
        }

        section.TitleEn = request.TitleEn.Trim();
        section.TitleKa = request.TitleKa?.Trim() ?? string.Empty;
        // Russian is no longer edited in the admin; keep any stored text unless one is sent.
        if (request.TitleRu is not null) section.TitleRu = request.TitleRu.Trim();
        section.BodyEn = request.BodyEn.Trim();
        section.BodyKa = request.BodyKa?.Trim() ?? string.Empty;
        if (request.BodyRu is not null) section.BodyRu = request.BodyRu.Trim();
        section.IsEnabled = request.IsEnabled;
        section.DisplayOrder = request.DisplayOrder;
        section.UpdatedAtUtc = DateTime.UtcNow;

        await db.SaveChangesAsync();
        return section.ToDto();
    }
}
