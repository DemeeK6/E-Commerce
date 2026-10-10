namespace MenswearStore.Api.Entities;

public class AppSetting
{
    public int Id { get; set; }
    public string Key { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public bool IsEnabled { get; set; }

    /// <summary>
    /// Free-text value for settings that carry content rather than an on/off state
    /// (the shop phone number, for instance). Empty for plain feature toggles.
    /// </summary>
    public string Value { get; set; } = string.Empty;
    public DateTime UpdatedAtUtc { get; set; } = DateTime.UtcNow;
}
