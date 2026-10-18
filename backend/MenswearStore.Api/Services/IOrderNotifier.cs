namespace MenswearStore.Api.Services;

using MenswearStore.Api.Entities;

/// <summary>
/// The single seam for order email. <see cref="SmtpOrderNotifier"/> sends over Gmail
/// when credentials are configured; otherwise <see cref="LoggingOrderNotifier"/> writes
/// the same messages to the log. The texts themselves live in <see cref="OrderEmails"/>.
/// </summary>
public interface IOrderNotifier
{
    /// <summary>A cash order was placed: tells the shop owner, and thanks the customer.</summary>
    Task CashOrderPlacedAsync(Order order, CancellationToken cancellationToken = default);

    /// <summary>
    /// The customer says they sent a bank transfer: asks the shop owner to check the
    /// balance, and thanks the customer.
    /// </summary>
    Task OrderAwaitingPaymentAsync(Order order, CancellationToken cancellationToken = default);

    /// <summary>Tells the customer their bank transfer arrived and the order is confirmed.</summary>
    Task PaymentConfirmedAsync(Order order, CancellationToken cancellationToken = default);

    /// <summary>Tells the customer their order was shipped, delivered or cancelled.</summary>
    Task StatusChangedAsync(Order order, CancellationToken cancellationToken = default);
}

/// <summary>Decides which emails each event produces; subclasses only decide how to deliver one.</summary>
public abstract class OrderNotifierBase(EmailOptions options) : IOrderNotifier
{
    public Task CashOrderPlacedAsync(Order order, CancellationToken cancellationToken = default) =>
        DeliverAllAsync(cancellationToken,
            OrderEmails.OwnerNewCashOrder(order, options.AdminRecipient),
            OrderEmails.CustomerOrderReceived(order));

    public Task OrderAwaitingPaymentAsync(Order order, CancellationToken cancellationToken = default) =>
        DeliverAllAsync(cancellationToken,
            OrderEmails.OwnerTransferSent(order, options.AdminRecipient),
            OrderEmails.CustomerOrderReceived(order));

    public Task PaymentConfirmedAsync(Order order, CancellationToken cancellationToken = default) =>
        DeliverAllAsync(cancellationToken, OrderEmails.CustomerPaymentConfirmed(order));

    public Task StatusChangedAsync(Order order, CancellationToken cancellationToken = default) =>
        DeliverAllAsync(cancellationToken, OrderEmails.CustomerStatusChanged(order));

    protected abstract Task DeliverAsync(OrderEmail email, CancellationToken cancellationToken);

    /// <summary>Null entries are customer emails for an order without an address, and are skipped.</summary>
    private async Task DeliverAllAsync(CancellationToken cancellationToken, params OrderEmail?[] emails)
    {
        foreach (var email in emails)
        {
            if (email is not null)
            {
                await DeliverAsync(email, cancellationToken);
            }
        }
    }
}
