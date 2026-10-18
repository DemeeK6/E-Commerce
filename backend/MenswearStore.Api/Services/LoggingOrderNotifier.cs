namespace MenswearStore.Api.Services;

using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

/// <summary>
/// Used when no Gmail account is configured. It records exactly what would be sent so
/// the flow can be exercised end to end, and so nothing silently does nothing.
/// </summary>
public class LoggingOrderNotifier(IOptions<EmailOptions> options, ILogger<LoggingOrderNotifier> logger)
    : OrderNotifierBase(options.Value)
{
    protected override Task DeliverAsync(OrderEmail email, CancellationToken cancellationToken)
    {
        logger.LogInformation(
            "EMAIL would have sent (no email account configured) -> {Recipient}: \"{Subject}\"\n{Body}",
            string.IsNullOrWhiteSpace(email.To) ? "(shop owner - no address set)" : email.To, email.Subject, email.Body);
        return Task.CompletedTask;
    }
}
