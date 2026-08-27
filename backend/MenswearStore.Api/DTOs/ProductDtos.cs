using MenswearStore.Api.Entities;

namespace MenswearStore.Api.DTOs;

public record ProductDto(
    int Id,
    string Name,
    string Description,
    decimal Price,
    decimal? DiscountPrice,
    CategoryDto? Category,
    GenderTarget GenderTarget,
    IReadOnlyList<string> Sizes,
    IReadOnlyList<ProductColorDto> Colors,
    IReadOnlyList<ProductImageDto> Images,
    int StockQuantity,
    bool IsActive);

public record ProductImageDto(int Id, string Url, string AltText, bool IsPrimary, int SortOrder, int? ColorId);
public record ProductColorDto(int Id, int ColorId, string NameEn, string NameKa, string NameRu, string HexCode);

public record UpsertProductRequest(
    string Name,
    string Description,
    decimal Price,
    decimal? DiscountPrice,
    int CategoryId,
    GenderTarget GenderTarget,
    string[] Sizes,
    ProductColorInput[] Colors,
    ProductImageInput[] Images,
    int StockQuantity,
    bool IsActive);

public record ProductColorInput(int ColorId);
public record ProductImageInput(string Url, string AltText, bool IsPrimary, int SortOrder, int? ColorId);
public record BulkDiscountRequest(int[] ProductIds, decimal Percentage);
