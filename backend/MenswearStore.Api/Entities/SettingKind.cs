namespace MenswearStore.Api.Entities;

/// <summary>
/// Tells the admin UI how to render a setting. Without it every setting shows as a
/// checkbox, which is wrong for a phone number.
/// </summary>
public enum SettingKind
{
    Toggle = 0,
    Text = 1
}
