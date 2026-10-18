using MenswearStore.Api.Data;
using MenswearStore.Api.DTOs;
using MenswearStore.Api.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace MenswearStore.Api.Controllers;

[ApiController]
[Route("api/home-hero")]
public class HomeHeroController(ApplicationDbContext db) : ControllerBase
{
    private const int MaxSlides = 10;

    /// <summary>
    /// Anonymous: the home page needs it. Hidden photos are left out unless an admin
    /// asks for them, the same as Info sections.
    /// </summary>
    [AllowAnonymous]
    [HttpGet]
    public async Task<ActionResult<HomeHeroDto>> Get(bool includeDisabled = false)
    {
        var hero = await LoadAsync();
        return hero.ToDto(includeDisabled && User.IsInRole("Admin"));
    }

    [Authorize(Roles = "Admin")]
    [HttpPut]
    public async Task<ActionResult<HomeHeroDto>> Update(UpdateHomeHeroRequest request)
    {
        var slides = request.Slides ?? [];
        if (slides.Count > MaxSlides)
        {
            return BadRequest(new { message = $"At most {MaxSlides} photos." });
        }

        if (slides.Any(slide => !IsAllowedImageUrl(slide.ImageUrl)))
        {
            return BadRequest(new { message = "Every photo must be an uploaded image." });
        }

        var hero = await LoadAsync();
        hero.EyebrowEn = request.EyebrowEn?.Trim() ?? string.Empty;
        hero.EyebrowKa = request.EyebrowKa?.Trim() ?? string.Empty;
        hero.EyebrowRu = request.EyebrowRu?.Trim() ?? string.Empty;
        hero.TitleEn = request.TitleEn?.Trim() ?? string.Empty;
        hero.TitleKa = request.TitleKa?.Trim() ?? string.Empty;
        hero.TitleRu = request.TitleRu?.Trim() ?? string.Empty;
        hero.SlideIntervalSeconds = Math.Clamp(request.SlideIntervalSeconds, 2, 30);

        // The admin edits the list as a whole (add, remove, reorder), so replacing it
        // is simpler and safer than matching rows by id.
        db.HeroSlides.RemoveRange(hero.Slides);
        hero.Slides = slides
            .Select((slide, index) => new HeroSlide
            {
                ImageUrl = slide.ImageUrl.Trim(),
                IsEnabled = slide.IsEnabled,
                DisplayOrder = index
            })
            .ToList();
        hero.UpdatedAtUtc = DateTime.UtcNow;

        await db.SaveChangesAsync();
        return hero.ToDto(includeDisabled: true);
    }

    private async Task<HomeHero> LoadAsync()
    {
        var hero = await db.HomeHeroes.Include(h => h.Slides).OrderBy(h => h.Id).FirstOrDefaultAsync();
        if (hero is null)
        {
            // The seeder normally creates it; this only covers a database seeded before it existed.
            hero = new HomeHero();
            db.HomeHeroes.Add(hero);
            await db.SaveChangesAsync();
        }

        return hero;
    }

    /// <summary>
    /// The URL ends up in a CSS background on every visitor's screen, so only our own
    /// uploads and plain https links are accepted - nothing that could break out of url().
    /// </summary>
    private static bool IsAllowedImageUrl(string? url)
    {
        if (string.IsNullOrWhiteSpace(url)) return false;
        url = url.Trim();
        if (url.IndexOfAny(['"', '\'', '(', ')', '\\', ' ', '<', '>']) >= 0) return false;
        return url.StartsWith("/uploads/", StringComparison.Ordinal)
            || url.StartsWith("https://", StringComparison.OrdinalIgnoreCase);
    }
}
