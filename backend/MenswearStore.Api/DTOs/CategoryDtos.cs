using MenswearStore.Api.Entities;

namespace MenswearStore.Api.DTOs;

public record CategoryDto(int Id, string NameEn, string NameKa, string NameRu, string Slug, GenderTarget GenderTarget, bool IsEnabled, int DisplayOrder);
public record UpsertCategoryRequest(string NameEn, string NameKa, string Slug, GenderTarget GenderTarget, bool IsEnabled, int DisplayOrder, string? NameRu = null);
