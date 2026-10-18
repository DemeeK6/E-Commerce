namespace MenswearStore.Api.Entities;

/// <summary>
/// How the customer intends to pay. Cash and BankTransfer are settled manually by the shop
/// owner today. A future card gateway is added here as one extra value - see PaymentStatus.
/// </summary>
public enum PaymentMethod
{
    Cash = 0,
    BankTransfer = 1
}
