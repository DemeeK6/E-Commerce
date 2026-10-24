namespace MenswearStore.Api.DTOs;

public record HeroSlideDto(int Id, string ImageUrl, bool IsEnabled, int DisplayOrder, int FocusX, int FocusY);

public record HomeHeroDto(
    string EyebrowEn, string EyebrowKa, string EyebrowRu,
    string TitleEn, string TitleKa, string TitleRu,
    int SlideIntervalSeconds,
    IReadOnlyList<HeroSlideDto> Slides);

/// <summary>Order in the list is the display order.</summary>
public record HeroSlideRequest(string ImageUrl, bool IsEnabled, int FocusX = 50, int FocusY = 35);

/// <summary>Replaces the whole banner in one save: texts, speed and the photo list.</summary>
public record UpdateHomeHeroRequest(
    string? EyebrowEn, string? EyebrowKa, string? EyebrowRu,
    string? TitleEn, string? TitleKa, string? TitleRu,
    int SlideIntervalSeconds,
    IReadOnlyList<HeroSlideRequest>? Slides);
