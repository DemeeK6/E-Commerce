namespace MenswearStore.Api.Entities;

/// <summary>
/// An account customers transfer to. Editable by the shop owner so a changed IBAN
/// never needs a code change.
/// </summary>
public class BankAccount
{
    public int Id { get; set; }
    public TransferBank Bank { get; set; }

    /// <summary>Name the transfer must be addressed to.</summary>
    public string AccountHolder { get; set; } = string.Empty;
    public string Iban { get; set; } = string.Empty;

    /// <summary>Free text, e.g. "USD, EUR, GEL" - shown so the customer knows what they may send.</summary>
    public string Currencies { get; set; } = string.Empty;

    public bool IsEnabled { get; set; } = true;
    public int DisplayOrder { get; set; }
    public DateTime UpdatedAtUtc { get; set; } = DateTime.UtcNow;
}
