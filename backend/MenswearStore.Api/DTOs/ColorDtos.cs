namespace MenswearStore.Api.DTOs;

public record ColorDto(int Id, string NameEn, string NameKa, string NameRu, string HexCode, int DisplayOrder, bool IsEnabled);
public record UpsertColorRequest(string NameEn, string NameKa, string HexCode, int DisplayOrder, bool IsEnabled, string? NameRu = null);
