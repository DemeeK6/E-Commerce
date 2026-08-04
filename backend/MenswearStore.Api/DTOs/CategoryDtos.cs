using MenswearStore.Api.Entities;

namespace MenswearStore.Api.DTOs;

public record CategoryDto(int Id, string Name, string Slug, GenderTarget GenderTarget, bool IsEnabled, int DisplayOrder);
public record UpsertCategoryRequest(string Name, string Slug, GenderTarget GenderTarget, bool IsEnabled, int DisplayOrder);
