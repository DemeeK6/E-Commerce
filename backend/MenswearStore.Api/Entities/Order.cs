namespace MenswearStore.Api.Entities;

public class Order
{
    public int Id { get; set; }

    /// <summary>
    /// What customers and the shop owner see, e.g. ON-261018-4827: "ON" (order number) prefix, order
    /// date in Tbilisi (yyMMdd), then four random digits. Unlike Id it does not reveal
    /// how many orders the shop has had, and it is the bank transfer reference.
    /// </summary>
    public string OrderNumber { get; set; } = string.Empty;

    /// <summary>Null for guest orders placed without an account.</summary>
    public string? UserId { get; set; }
    public ApplicationUser? User { get; set; }

    // Captured on every order, guest or not, so the shop owner can fulfil it without
    // depending on an account record that may not exist.
    public string CustomerFirstName { get; set; } = string.Empty;
    public string CustomerLastName { get; set; } = string.Empty;
    public string CustomerPhone { get; set; } = string.Empty;
    public string CustomerEmail { get; set; } = string.Empty;
    public string ShippingAddress { get; set; } = string.Empty;

    /// <summary>The site language the customer ordered in ("en", "ka" or "ru"); their emails use it.</summary>
    public string Language { get; set; } = "en";

    public PaymentMethod PaymentMethod { get; set; } = PaymentMethod.Cash;
    public PaymentStatus PaymentStatus { get; set; } = PaymentStatus.Pending;

    /// <summary>Empty today. A payment gateway's transaction id belongs here.</summary>
    public string PaymentReference { get; set; } = string.Empty;

    /// <summary>
    /// Set only for bank transfers: which bank the customer said they would send from,
    /// so the shop owner checks the right account when confirming payment.
    /// </summary>
    public TransferBank? TransferBank { get; set; }

    /// <summary>
    /// Set when the customer says they have sent the transfer. Distinct from
    /// PaymentStatus, which only the shop owner sets once she sees the money.
    /// Null means the customer never came back from the instructions screen.
    /// </summary>
    public DateTime? CustomerConfirmedPaymentAtUtc { get; set; }

    /// <summary>
    /// Capability token handed to whoever placed the order. Confirming or cancelling
    /// is open to guests - they have no account - so without this, anyone could cancel
    /// a stranger's order by guessing its id.
    /// </summary>
    public Guid PublicToken { get; set; } = Guid.NewGuid();

    /// <summary>Always in lari - the currency every product price is entered in.</summary>
    public decimal Total { get; set; }

    /// <summary>
    /// The currency the customer shopped in ("GEL" or "USD") and the National Bank rate
    /// at checkout (lari per dollar). Kept so a dollar transfer can be matched to exactly
    /// the amount the customer was shown, whatever the rate is later.
    /// </summary>
    public string Currency { get; set; } = "GEL";
    public decimal ExchangeRate { get; set; } = 1m;

    /// <summary>What the customer was asked to pay, in their currency.</summary>
    public decimal TotalInCurrency => InCurrency(Total);

    /// <summary>A lari amount from this order, in the customer's currency at the order's rate.</summary>
    public decimal InCurrency(decimal lari) =>
        Currency == "USD" && ExchangeRate > 0 ? decimal.Round(lari / ExchangeRate, 2) : lari;
    public string Status { get; set; } = "Pending";
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
    public ICollection<OrderItem> Items { get; set; } = new List<OrderItem>();
}
