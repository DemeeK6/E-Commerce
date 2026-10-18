namespace MenswearStore.Api.Services;

/// <summary>
/// SMTP settings. Everything except the password lives in appsettings.json; the
/// password must come from user-secrets or an environment variable, because
/// appsettings.json is committed and a Gmail App Password in a public repository
/// is a compromised account.
/// </summary>
public class EmailOptions
{
    public const string SectionName = "Email";

    public string Host { get; set; } = "smtp.gmail.com";

    /// <summary>587 is Gmail's STARTTLS port. 465 (implicit TLS) also works.</summary>
    public int Port { get; set; } = 587;

    /// <summary>The Gmail account that authenticates and sends.</summary>
    public string FromAddress { get; set; } = string.Empty;

    /// <summary>Shown as the sender name. Gmail still reveals the real account.</summary>
    public string FromName { get; set; } = "SOFIO";

    /// <summary>
    /// A 16-character Gmail App Password, never the account password - Google
    /// rejects those for SMTP. Supplied out of band; see README.
    /// </summary>
    public string AppPassword { get; set; } = string.Empty;

    /// <summary>
    /// Where order notifications go. Defaults to the sending address, which is the
    /// usual arrangement for a one-person shop.
    /// </summary>
    public string AdminAddress { get; set; } = string.Empty;

    public string AdminRecipient => string.IsNullOrWhiteSpace(AdminAddress) ? FromAddress : AdminAddress;

    /// <summary>
    /// False until both the account and its password are present. The application
    /// falls back to logging rather than failing to start, so a missing secret never
    /// takes the shop offline.
    /// </summary>
    public bool IsConfigured =>
        !string.IsNullOrWhiteSpace(FromAddress) && !string.IsNullOrWhiteSpace(AppPassword);
}
