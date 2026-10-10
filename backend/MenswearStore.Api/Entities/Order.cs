namespace MenswearStore.Api.Entities;

public class Order
{
    public int Id { get; set; }

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

    public PaymentMethod PaymentMethod { get; set; } = PaymentMethod.Cash;
    public PaymentStatus PaymentStatus { get; set; } = PaymentStatus.Pending;

    /// <summary>Empty today. A payment gateway's transaction id belongs here.</summary>
    public string PaymentReference { get; set; } = string.Empty;

    /// <summary>
    /// Set only for bank transfers: which bank the customer said they would send from,
    /// so the shop owner checks the right account when confirming payment.
    /// </summary>
    public TransferBank? TransferBank { get; set; }

    public decimal Total { get; set; }
    public string Status { get; set; } = "Pending";
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
    public ICollection<OrderItem> Items { get; set; } = new List<OrderItem>();
}
