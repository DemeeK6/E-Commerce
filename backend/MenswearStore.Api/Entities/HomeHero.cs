namespace MenswearStore.Api.Entities;

/// <summary>
/// The welcome banner at the top of the home page. There is exactly one row; the
/// seeder creates it. Blank texts fall back to the built-in translations
/// ("Spring edit 2026", "SOFIO"), so a fresh shop looks the same as before.
/// </summary>
public class HomeHero
{
    public int Id { get; set; }

    /// <summary>The small line above the big title.</summary>
    public string EyebrowEn { get; set; } = string.Empty;
    public string EyebrowKa { get; set; } = string.Empty;
    public string EyebrowRu { get; set; } = string.Empty;

    public string TitleEn { get; set; } = string.Empty;
    public string TitleKa { get; set; } = string.Empty;
    public string TitleRu { get; set; } = string.Empty;

    /// <summary>How long each photo stays before the next one, when there are several.</summary>
    public int SlideIntervalSeconds { get; set; } = 6;

    public List<HeroSlide> Slides { get; set; } = new();
    public DateTime UpdatedAtUtc { get; set; } = DateTime.UtcNow;
}
