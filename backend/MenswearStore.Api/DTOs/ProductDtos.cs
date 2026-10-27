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

public record ProductImageDto(int Id, string Url, string AltText, bool IsPrimary, int SortOrder, int? ColorId, int FocusX, int FocusY);
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
// FocusX/FocusY default to the centre so an older client that does not send them
// leaves photos cropping exactly as they did before.
public record ProductImageInput(string Url, string AltText, bool IsPrimary, int SortOrder, int? ColorId, int FocusX = 50, int FocusY = 50);
public record BulkDiscountRequest(int[] ProductIds, decimal Percentage);
public record SetProductActiveRequest(bool IsActive);
