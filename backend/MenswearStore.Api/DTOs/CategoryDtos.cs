using MenswearStore.Api.Entities;

namespace MenswearStore.Api.DTOs;

public record CategoryDto(int Id, string NameEn, string NameKa, string NameRu, string Slug, GenderTarget GenderTarget, bool IsEnabled, int DisplayOrder);
// No Slug: the controller derives it from NameEn and GenderTarget, so a caller
// cannot submit one that contradicts the name it is attached to.
public record UpsertCategoryRequest(string NameEn, string NameKa, GenderTarget GenderTarget, bool IsEnabled, int DisplayOrder, string? NameRu = null);
