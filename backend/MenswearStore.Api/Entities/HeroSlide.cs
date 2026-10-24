namespace MenswearStore.Api.Entities;

/// <summary>
/// One photo of the home page banner. One enabled photo shows on its own; two or
/// more turn into a slideshow. With none, the built-in default photo is shown.
/// </summary>
public class HeroSlide
{
    public int Id { get; set; }
    public int HomeHeroId { get; set; }
    public HomeHero? HomeHero { get; set; }

    /// <summary>An /uploads/... path from UploadsController, or a full https URL.</summary>
    public string ImageUrl { get; set; } = string.Empty;

    /// <summary>Hidden photos stay in the list so the admin can bring them back.</summary>
    public bool IsEnabled { get; set; } = true;
    public int DisplayOrder { get; set; }

    /// <summary>
    /// The point of the photo to keep in view, as percentages from the left and top
    /// (0-100). The banner crops differently on computers and phones; it always keeps
    /// this spot visible. Defaults to the centre, slightly high, as before.
    /// </summary>
    public int FocusX { get; set; } = 50;
    public int FocusY { get; set; } = 35;
}
