namespace MenswearStore.Api.Entities;

public class ProductSize
{
    public int Id { get; set; }
    public int ProductId { get; set; }
    public Product? Product { get; set; }
    public string Name { get; set; } = string.Empty;
}
