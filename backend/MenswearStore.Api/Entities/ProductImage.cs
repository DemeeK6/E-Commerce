namespace MenswearStore.Api.Entities;

public class ProductImage
{
    public int Id { get; set; }
    public int ProductId { get; set; }
    public Product? Product { get; set; }
    public string Url { get; set; } = string.Empty;
    public string AltText { get; set; } = string.Empty;
    public bool IsPrimary { get; set; }
    public int SortOrder { get; set; }
    public int? ColorId { get; set; }
    public Color? Color { get; set; }

    /// <summary>
    /// The point of the photo to keep in view, as percentages from the left and top
    /// (0-100). Product photos are cropped to 4:5 in the grid and the gallery, so a
    /// tall photo loses its top and bottom; this is the spot that always survives the
    /// crop. Centre by default, which is what the crop did before this existed.
    /// Same idea as HeroSlide.FocusX/FocusY, applied to object-position instead of
    /// background-position.
    /// </summary>
    public int FocusX { get; set; } = 50;
    public int FocusY { get; set; } = 50;
}
