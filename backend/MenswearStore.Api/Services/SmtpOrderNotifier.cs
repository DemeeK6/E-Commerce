using System.Globalization;
using MailKit.Net.Smtp;
using MailKit.Security;
using MenswearStore.Api.Entities;
using Microsoft.Extensions.Options;
using MimeKit;
using MimeKit.Text;

namespace MenswearStore.Api.Services;

/// <summary>
/// Sends the two order emails over SMTP. Registered only when credentials are present;
/// otherwise <see cref="LoggingOrderNotifier"/> takes its place.
/// </summary>
public class SmtpOrderNotifier(
    IOptions<EmailOptions> options,
    ILogger<SmtpOrderNotifier> logger) : IOrderNotifier
{
    private readonly EmailOptions _options = options.Value;

    // The shop prices in dollars, and the server runs under the invariant culture
    // where ":C" prints a generic currency sign rather than "$".
    private static readonly CultureInfo Money = CultureInfo.GetCultureInfo("en-US");

    public Task OrderAwaitingPaymentAsync(Order order, CancellationToken cancellationToken = default)
    {
        var bank = order.TransferBank == Entities.TransferBank.BankOfGeorgia ? "Bank of Georgia" : "TBC Bank";
        var body = $"""
            Order #{order.Id} is waiting for you to check the balance.

            The customer says they have sent a {bank} transfer.

              Amount    {order.Total.ToString("C", Money)}
              Reference #{order.Id}  (they were asked to put this in the transfer description)

            Customer
              {order.CustomerFirstName} {order.CustomerLastName}
              {order.CustomerPhone}
              {(string.IsNullOrWhiteSpace(order.CustomerEmail) ? "no email given" : order.CustomerEmail)}

            Deliver to
              {order.ShippingAddress}

            Items
            {string.Join("\n", order.Items.Select(i => $"  {i.Quantity} x {i.ProductName} ({i.Size}, {i.Color}) - {(i.UnitPrice * i.Quantity).ToString("C", Money)}"))}

            Once the money is in, mark the order paid in the admin panel. That sends the
            customer their confirmation.
            """;

        return SendAsync(_options.AdminRecipient, $"Order #{order.Id} - payment sent, please check", body, cancellationToken);
    }

    public Task PaymentConfirmedAsync(Order order, CancellationToken cancellationToken = default)
    {
        // A cash order or a guest who left the address blank has nobody to write to.
        if (string.IsNullOrWhiteSpace(order.CustomerEmail))
        {
            logger.LogInformation(
                "Order {OrderId} was confirmed but carries no customer email, so no confirmation was sent.",
                order.Id);
            return Task.CompletedTask;
        }

        var body = $"""
            Hello {order.CustomerFirstName},

            We have received your payment for order #{order.Id}. Your order is confirmed and
            we will be in touch about delivery.

              Total {order.Total.ToString("C", Money)}

            Items
            {string.Join("\n", order.Items.Select(i => $"  {i.Quantity} x {i.ProductName} ({i.Size}, {i.Color})"))}

            Delivering to
              {order.ShippingAddress}

            Thank you,
            SOFIO
            """;

        return SendAsync(order.CustomerEmail, $"Order #{order.Id} confirmed", body, cancellationToken);
    }

    private async Task SendAsync(string to, string subject, string body, CancellationToken cancellationToken)
    {
        var message = new MimeMessage();
        message.From.Add(new MailboxAddress(_options.FromName, _options.FromAddress));
        message.To.Add(MailboxAddress.Parse(to));
        message.Subject = subject;
        message.Body = new TextPart(TextFormat.Plain) { Text = body };

        try
        {
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

            logger.LogInformation("Sent \"{Subject}\" to {Recipient}.", subject, to);
        }
        catch (Exception exception)
        {
            // An order must never fail because the mail server is unreachable. The
            // shop owner can still see the order in the admin panel.
            logger.LogError(exception, "Could not send \"{Subject}\" to {Recipient}.", subject, to);
        }
    }
}
