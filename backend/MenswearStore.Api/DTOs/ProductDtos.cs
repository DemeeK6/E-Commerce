using System.ComponentModel.DataAnnotations;
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
    bool IsActive);

public record ProductImageDto(int Id, string Url, string AltText, bool IsPrimary, int SortOrder, int? ColorId);
public record ProductColorDto(int Id, int ColorId, string NameEn, string NameKa, string NameRu, string HexCode);

public record UpsertProductRequest(
    string Name,
    string Description,
    // On the parameter, not `property:` - ASP.NET refuses (500) a record whose
    // validation attributes sit on the generated properties.
    [Range(0, 99999999.99)] decimal Price,
    [Range(0, 99999999.99)] decimal? DiscountPrice,
    int CategoryId,
    string[] Sizes,
    ProductColorInput[] Colors,
    ProductImageInput[] Images,
    bool IsActive);

public record ProductColorInput(int ColorId);
public record ProductImageInput(string Url, string AltText, bool IsPrimary, int SortOrder, int? ColorId);
public record BulkDiscountRequest(int[] ProductIds, decimal Percentage);
public record SetProductActiveRequest(bool IsActive);
