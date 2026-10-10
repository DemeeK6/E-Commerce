namespace MenswearStore.Api.DTOs;

using MenswearStore.Api.Entities;

public record AppSettingDto(int Id, string Key, string Name, bool IsEnabled, string Value, SettingKind Kind);
/// <summary>Value is ignored for toggles, IsEnabled for text settings.</summary>
public record UpdateSettingRequest(bool IsEnabled, string? Value);
