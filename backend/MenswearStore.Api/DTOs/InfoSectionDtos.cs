using System.ComponentModel.DataAnnotations;

namespace MenswearStore.Api.DTOs;

public record InfoSectionDto(
    int Id, string Key,
    string TitleEn, string TitleKa, string TitleRu,
    string BodyEn, string BodyKa, string BodyRu,
    bool IsEnabled, int DisplayOrder);

public record UpsertInfoSectionRequest(
    [Required] string TitleEn, string? TitleKa, string? TitleRu,
    [Required] string BodyEn, string? BodyKa, string? BodyRu,
    bool IsEnabled, int DisplayOrder);
