namespace MenswearStore.Api.DTOs;

public record AppSettingDto(int Id, string Key, string Name, bool IsEnabled);
public record UpdateSettingRequest(bool IsEnabled);
