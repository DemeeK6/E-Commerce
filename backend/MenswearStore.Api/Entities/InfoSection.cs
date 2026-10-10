namespace MenswearStore.Api.Entities;

/// <summary>
/// One block of text on the public Info page. Stored rather than hardcoded so the shop
/// owner can reword a delivery or payment policy without a code change.
/// </summary>
public class InfoSection
{
    public int Id { get; set; }

    /// <summary>Stable identifier ("delivery", "payment") so seeding stays idempotent.</summary>
    public string Key { get; set; } = string.Empty;

    public string TitleEn { get; set; } = string.Empty;
    public string TitleKa { get; set; } = string.Empty;
    public string TitleRu { get; set; } = string.Empty;

    /// <summary>Plain text. Line breaks are preserved when rendered; no markup is interpreted.</summary>
    public string BodyEn { get; set; } = string.Empty;
    public string BodyKa { get; set; } = string.Empty;
    public string BodyRu { get; set; } = string.Empty;

    public bool IsEnabled { get; set; } = true;
    public int DisplayOrder { get; set; }
    public DateTime UpdatedAtUtc { get; set; } = DateTime.UtcNow;
}
