namespace MenswearStore.Api.Entities;

/// <summary>
/// Tracked separately from Order.Status so that payment and fulfilment move independently.
/// This separation is what lets a real payment gateway be added later without restructuring:
/// a webhook simply moves an order from Pending to Paid, exactly as the admin "mark paid"
/// action does for cash and bank transfers today.
/// </summary>
public enum PaymentStatus
{
    Pending = 0,
    Paid = 1,
    Failed = 2,
    Refunded = 3
}
