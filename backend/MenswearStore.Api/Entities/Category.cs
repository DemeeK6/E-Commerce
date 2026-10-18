namespace MenswearStore.Api.Entities;

public class Category
{
    public int Id { get; set; }
    public string NameEn { get; set; } = string.Empty;
    public string NameKa { get; set; } = string.Empty;
    public string NameRu { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;
    public GenderTarget GenderTarget { get; set; } = GenderTarget.Men;
    public bool IsEnabled { get; set; } = true;
    public int DisplayOrder { get; set; }
    public ICollection<Product> Products { get; set; } = new List<Product>();
}
