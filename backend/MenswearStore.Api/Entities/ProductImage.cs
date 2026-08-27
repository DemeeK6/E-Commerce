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
}
