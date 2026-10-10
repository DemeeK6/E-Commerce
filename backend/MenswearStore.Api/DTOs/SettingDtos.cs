namespace MenswearStore.Api.DTOs;

public record AppSettingDto(int Id, string Key, string Name, bool IsEnabled, string Value);
public record UpdateSettingRequest(bool IsEnabled);
