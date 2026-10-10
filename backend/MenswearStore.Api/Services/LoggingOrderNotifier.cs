namespace MenswearStore.Api.Services;

using MenswearStore.Api.Entities;
using System.Globalization;
using Microsoft.Extensions.Logging;

/// <summary>
/// Stand-in until an email provider is chosen. It records exactly what would be sent so
/// the flow can be exercised end to end, and so nothing silently does nothing.
/// </summary>
public class LoggingOrderNotifier(ILogger<LoggingOrderNotifier> logger) : IOrderNotifier
{
    // The server runs under the invariant culture, where ":C" prints the generic
    // currency sign (¤) rather than "$". The shop prices in dollars, so format
    // against en-US explicitly - a real email must never show ¤108.00.
    private static readonly CultureInfo Money = CultureInfo.GetCultureInfo("en-US");

    private static string Format(decimal amount) => amount.ToString("C", Money);

    public Task OrderAwaitingPaymentAsync(Order order, CancellationToken cancellationToken = default)
    {
        logger.LogInformation(
            "EMAIL (not sent - no provider configured) -> shop owner: order #{OrderId} is awaiting a {Bank} transfer of {Total} from {Customer} ({Phone}).",
            order.Id, order.TransferBank, Format(order.Total),
            $"{order.CustomerFirstName} {order.CustomerLastName}", order.CustomerPhone);
        return Task.CompletedTask;
    }

    public Task PaymentConfirmedAsync(Order order, CancellationToken cancellationToken = default)
    {
        var recipient = string.IsNullOrWhiteSpace(order.CustomerEmail) ? "(no email on the order)" : order.CustomerEmail;
        logger.LogInformation(
            "EMAIL (not sent - no provider configured) -> {Recipient}: payment received for order #{OrderId}, total {Total}.",
            recipient, order.Id, Format(order.Total));
        return Task.CompletedTask;
    }
}
