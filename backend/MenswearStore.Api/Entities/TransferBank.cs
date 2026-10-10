namespace MenswearStore.Api.Entities;

/// <summary>
/// Which Georgian bank the customer says they will transfer from. Recorded on the order
/// so the shop owner knows which account balance to check when confirming payment.
/// </summary>
public enum TransferBank
{
    Tbc = 0,
    BankOfGeorgia = 1
}
