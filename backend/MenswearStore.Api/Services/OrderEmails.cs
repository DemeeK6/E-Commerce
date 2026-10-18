using System.Globalization;
using MenswearStore.Api.Entities;

namespace MenswearStore.Api.Services;

public record OrderEmail(string To, string Subject, string Body);

/// <summary>
/// Builds every order email. Emails to the shop owner are in English; emails to the
/// customer are in the language they shopped in (Order.Language). Kept apart from
/// sending so the SMTP and logging notifiers produce exactly the same messages.
/// </summary>
public static class OrderEmails
{
    // The shop prices in dollars, and the server runs under the invariant culture
    // where ":C" prints a generic currency sign rather than "$".
    private static readonly CultureInfo Money = CultureInfo.GetCultureInfo("en-US");

    private static string Format(decimal amount) => amount.ToString("C", Money);

    // ---- To the shop owner ----

    public static OrderEmail OwnerNewCashOrder(Order order, string ownerAddress) => new(
        ownerAddress,
        $"New order #{order.Id} - cash on delivery",
        $"""
        A new cash-on-delivery order has been placed.

          Amount    {Format(order.Total)}

        {OwnerCustomerBlock(order)}

        Call the customer to arrange delivery. Mark the order paid in the admin panel
        once the cash is collected.
        """);

    public static OrderEmail OwnerTransferSent(Order order, string ownerAddress)
    {
        var bank = order.TransferBank == TransferBank.BankOfGeorgia ? "Bank of Georgia" : "TBC Bank";
        return new(
            ownerAddress,
            $"Order #{order.Id} - payment sent, please check",
            $"""
            Order #{order.Id} is waiting for you to check the balance.

            The customer says they have sent a {bank} transfer.

              Amount    {Format(order.Total)}
              Reference #{order.Id}  (they were asked to put this in the transfer description)

            {OwnerCustomerBlock(order)}

            Once the money is in, mark the order paid in the admin panel. That sends the
            customer their confirmation.
            """);
    }

    private static string OwnerCustomerBlock(Order order) => $"""
        Customer
          {order.CustomerFirstName} {order.CustomerLastName}
          {order.CustomerPhone}
          {(string.IsNullOrWhiteSpace(order.CustomerEmail) ? "no email given" : order.CustomerEmail)}

        Deliver to
          {order.ShippingAddress}

        Items
        {string.Join("\n", order.Items.Select(i => $"  {i.Quantity} x {i.ProductName}{Options(i)} - {Format(i.UnitPrice * i.Quantity)}"))}
        """;

    // ---- To the customer (null when the order has no email address) ----

    /// <summary>Cash: sent when the order is placed. Transfer: sent when the customer says they have paid.</summary>
    public static OrderEmail? CustomerOrderReceived(Order order)
    {
        var text = Texts(order);
        var intro = order.PaymentMethod == PaymentMethod.BankTransfer
            ? text.ReceivedTransfer(order)
            : text.ReceivedCash(order);
        return Customer(order, text.ReceivedSubject(order.Id), intro, withSummary: true);
    }

    /// <summary>Bank transfers only - for cash the money arrives with the delivery.</summary>
    public static OrderEmail? CustomerPaymentConfirmed(Order order)
    {
        var text = Texts(order);
        return Customer(order, text.ConfirmedSubject(order.Id), text.Confirmed(order), withSummary: true);
    }

    /// <summary>Shipped, Delivered and Cancelled; null for any other status.</summary>
    public static OrderEmail? CustomerStatusChanged(Order order)
    {
        var text = Texts(order);
        return order.Status switch
        {
            "Shipped" => Customer(order, text.ShippedSubject(order.Id), text.Shipped(order), withSummary: false),
            "Delivered" => Customer(order, text.DeliveredSubject(order.Id), text.Delivered(order), withSummary: false),
            "Cancelled" => Customer(order, text.CancelledSubject(order.Id), text.Cancelled(order), withSummary: false),
            _ => null
        };
    }

    private static OrderEmail? Customer(Order order, string subject, string intro, bool withSummary)
    {
        if (string.IsNullOrWhiteSpace(order.CustomerEmail)) return null;

        var text = Texts(order);
        var summary = withSummary
            ? $"""


                  {text.Total} {Format(order.Total)}

                {text.Items}
                {string.Join("\n", order.Items.Select(i => $"  {i.Quantity} x {i.ProductName}{Options(i)}"))}

                {text.DeliveringTo}
                  {order.ShippingAddress}
                """
            : string.Empty;

        var body = $"""
            {text.Hello(order.CustomerFirstName)}

            {intro}{summary}

            {text.SignOff}
            SOFIO
            """;

        return new OrderEmail(order.CustomerEmail, subject, body);
    }

    /// <summary>" (M, Navy)", or nothing when the line has neither size nor colour.</summary>
    private static string Options(OrderItem item)
    {
        var parts = new[] { item.Size, item.Color }.Where(part => !string.IsNullOrWhiteSpace(part)).ToArray();
        return parts.Length == 0 ? string.Empty : $" ({string.Join(", ", parts)})";
    }

    private static CustomerTexts Texts(Order order) => order.Language switch
    {
        "ka" => Georgian,
        "ru" => Russian,
        _ => English
    };

    private sealed record CustomerTexts(
        Func<string, string> Hello,
        string SignOff,
        string Total,
        string Items,
        string DeliveringTo,
        Func<int, string> ReceivedSubject,
        Func<Order, string> ReceivedCash,
        Func<Order, string> ReceivedTransfer,
        Func<int, string> ConfirmedSubject,
        Func<Order, string> Confirmed,
        Func<int, string> ShippedSubject,
        Func<Order, string> Shipped,
        Func<int, string> DeliveredSubject,
        Func<Order, string> Delivered,
        Func<int, string> CancelledSubject,
        Func<Order, string> Cancelled);

    private static readonly CustomerTexts English = new(
        Hello: name => $"Hello {name},",
        SignOff: "Thank you,",
        Total: "Total",
        Items: "Items",
        DeliveringTo: "Delivering to",
        ReceivedSubject: id => $"We received your order #{id}",
        ReceivedCash: o => $"Thank you for your order #{o.Id}. We will call you on {o.CustomerPhone} to arrange delivery. You pay in cash when it arrives.",
        ReceivedTransfer: o => $"Thank you for your order #{o.Id}. We will check the bank transfer and email you as soon as the payment arrives.",
        ConfirmedSubject: id => $"Order #{id} confirmed",
        Confirmed: o => $"We have received your payment for order #{o.Id}. Your order is confirmed and we will be in touch about delivery.",
        ShippedSubject: id => $"Your order #{id} is on its way",
        Shipped: o => $"Good news - your order #{o.Id} has been sent. We will call you on {o.CustomerPhone} if the courier needs anything.",
        DeliveredSubject: id => $"Your order #{id} has been delivered",
        Delivered: o => $"Your order #{o.Id} has been delivered. Thank you for shopping with SOFIO!",
        CancelledSubject: id => $"Your order #{id} was cancelled",
        Cancelled: o => $"Your order #{o.Id} has been cancelled. If you think this is a mistake, or you have already paid, please reply to this email.");

    private static readonly CustomerTexts Georgian = new(
        Hello: name => $"გამარჯობა, {name}!",
        SignOff: "პატივისცემით,",
        Total: "ჯამი",
        Items: "პროდუქტები",
        DeliveringTo: "მიწოდების მისამართი",
        ReceivedSubject: id => $"თქვენი შეკვეთა #{id} მიღებულია",
        ReceivedCash: o => $"გმადლობთ შეკვეთისთვის #{o.Id}. მიწოდების შესათანხმებლად დაგირეკავთ ნომერზე {o.CustomerPhone}. გადახდა ხდება ნაღდი ფულით, მიტანისას.",
        ReceivedTransfer: o => $"გმადლობთ შეკვეთისთვის #{o.Id}. გადავამოწმებთ საბანკო გადარიცხვას და მოგწერთ, როგორც კი თანხა ჩაირიცხება.",
        ConfirmedSubject: id => $"შეკვეთა #{id} დადასტურებულია",
        Confirmed: o => $"თქვენი გადახდა შეკვეთისთვის #{o.Id} მიღებულია. შეკვეთა დადასტურებულია და მალე დაგიკავშირდებით მიწოდებასთან დაკავშირებით.",
        ShippedSubject: id => $"თქვენი შეკვეთა #{id} გზაშია",
        Shipped: o => $"თქვენი შეკვეთა #{o.Id} გამოგზავნილია. საჭიროების შემთხვევაში დაგირეკავთ ნომერზე {o.CustomerPhone}.",
        DeliveredSubject: id => $"თქვენი შეკვეთა #{id} მიტანილია",
        Delivered: o => $"თქვენი შეკვეთა #{o.Id} მიტანილია. გმადლობთ, რომ SOFIO აირჩიეთ!",
        CancelledSubject: id => $"თქვენი შეკვეთა #{id} გაუქმდა",
        Cancelled: o => $"თქვენი შეკვეთა #{o.Id} გაუქმებულია. თუ ეს შეცდომაა, ან უკვე გადაიხადეთ, გთხოვთ, უპასუხოთ ამ წერილს.");

    private static readonly CustomerTexts Russian = new(
        Hello: name => $"Здравствуйте, {name}!",
        SignOff: "С уважением,",
        Total: "Итого",
        Items: "Товары",
        DeliveringTo: "Адрес доставки",
        ReceivedSubject: id => $"Ваш заказ #{id} получен",
        ReceivedCash: o => $"Спасибо за заказ #{o.Id}. Мы позвоним вам по номеру {o.CustomerPhone}, чтобы договориться о доставке. Оплата наличными при получении.",
        ReceivedTransfer: o => $"Спасибо за заказ #{o.Id}. Мы проверим банковский перевод и напишем вам, как только оплата поступит.",
        ConfirmedSubject: id => $"Заказ #{id} подтверждён",
        Confirmed: o => $"Мы получили оплату за заказ #{o.Id}. Заказ подтверждён, скоро мы свяжемся с вами по поводу доставки.",
        ShippedSubject: id => $"Ваш заказ #{id} в пути",
        Shipped: o => $"Ваш заказ #{o.Id} отправлен. Если курьеру что-то понадобится, мы позвоним вам по номеру {o.CustomerPhone}.",
        DeliveredSubject: id => $"Ваш заказ #{id} доставлен",
        Delivered: o => $"Ваш заказ #{o.Id} доставлен. Спасибо, что выбрали SOFIO!",
        CancelledSubject: id => $"Ваш заказ #{id} отменён",
        Cancelled: o => $"Ваш заказ #{o.Id} отменён. Если это ошибка или вы уже оплатили заказ, пожалуйста, ответьте на это письмо.");
}
