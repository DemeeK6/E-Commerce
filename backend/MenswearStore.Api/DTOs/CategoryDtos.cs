using MenswearStore.Api.Entities;

namespace MenswearStore.Api.DTOs;

// ProductCount lets the admin screen know, before anyone presses Delete, whether the
// products will need moving first. Populated by the categories listing; other places
// that embed a category (a product, say) leave it at zero.
public record CategoryDto(int Id, string NameEn, string NameKa, string NameRu, string Slug, GenderTarget GenderTarget, bool IsEnabled, int DisplayOrder, int ProductCount = 0);
// No Slug: the controller derives it from NameEn and GenderTarget, so a caller
// cannot submit one that contradicts the name it is attached to.
public record UpsertCategoryRequest(string NameEn, string NameKa, GenderTarget GenderTarget, bool IsEnabled, int DisplayOrder, string? NameRu = null);
