namespace MenswearStore.Api.Services;

using MenswearStore.Api.Entities;

/// <summary>
/// The single seam for order email. Nothing is actually sent yet - the shop has not
/// chosen an email provider. <see cref="LoggingOrderNotifier"/> writes to the log
/// instead, so the call sites are already correct and wiring a real provider is a
/// one-line change in Program.cs rather than a rewrite.
/// </summary>
public interface IOrderNotifier
{
    /// <summary>Tells the shop owner a bank-transfer order is waiting for her to check the balance.</summary>
    Task OrderAwaitingPaymentAsync(Order order, CancellationToken cancellationToken = default);

    /// <summary>Tells the customer their payment was received and the order is confirmed.</summary>
    Task PaymentConfirmedAsync(Order order, CancellationToken cancellationToken = default);
}
