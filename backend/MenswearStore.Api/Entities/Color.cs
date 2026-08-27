namespace MenswearStore.Api.Entities;

public class Color
{
    public int Id { get; set; }
    public string NameEn { get; set; } = string.Empty;
    public string NameKa { get; set; } = string.Empty;
    public string NameRu { get; set; } = string.Empty;
    public string HexCode { get; set; } = "#111111";
    public int DisplayOrder { get; set; }
    public bool IsEnabled { get; set; } = true;
    public ICollection<ProductColor> ProductColors { get; set; } = new List<ProductColor>();
    public ICollection<ProductImage> Images { get; set; } = new List<ProductImage>();
}
