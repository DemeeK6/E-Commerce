using MailKit.Net.Smtp;
using MailKit.Security;
using Microsoft.Extensions.Options;
using MimeKit;
using MimeKit.Text;

namespace MenswearStore.Api.Services;

/// <summary>
/// Sends the order emails over SMTP. Registered only when credentials are present;
/// otherwise <see cref="LoggingOrderNotifier"/> takes its place.
/// </summary>
public class SmtpOrderNotifier(
    IOptions<EmailOptions> options,
    ILogger<SmtpOrderNotifier> logger) : OrderNotifierBase(options.Value)
{
    private readonly EmailOptions _options = options.Value;

    protected override async Task DeliverAsync(OrderEmail email, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(email.To))
        {
            logger.LogWarning("Not sending \"{Subject}\": no recipient address.", email.Subject);
            return;
        }

        var message = new MimeMessage();
        message.From.Add(new MailboxAddress(_options.FromName, _options.FromAddress));
        message.Subject = email.Subject;
        message.Body = new TextPart(TextFormat.Plain) { Text = email.Body };

        try
        {
            message.To.Add(MailboxAddress.Parse(email.To));

            using var client = new SmtpClient();
            // StartTlsWhenAvailable rather than a fixed mode, so the same code works
            // against Gmail's 587 and against a local server during testing.
            await client.ConnectAsync(_options.Host, _options.Port, SecureSocketOptions.StartTlsWhenAvailable, cancellationToken);
            if (client.Capabilities.HasFlag(SmtpCapabilities.Authentication))
            {
                await client.AuthenticateAsync(_options.FromAddress, _options.AppPassword, cancellationToken);
            }
            await client.SendAsync(message, cancellationToken);
            await client.DisconnectAsync(true, cancellationToken);

            logger.LogInformation("Sent \"{Subject}\" to {Recipient}.", email.Subject, email.To);
        }
        catch (Exception exception)
        {
            // An order must never fail because the mail server is unreachable or an
            // address is malformed. The shop owner can still see the order in the admin panel.
            logger.LogError(exception, "Could not send \"{Subject}\" to {Recipient}.", email.Subject, email.To);
        }
    }
}
