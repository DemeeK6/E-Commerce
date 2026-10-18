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

    // "176.52 ₾": dot decimals with the symbol after, as Georgian shops write it.
    private static readonly CultureInfo Lari = CultureInfo.InvariantCulture;

    private static string Format(decimal amount) => amount.ToString("C", Money);

    /// <summary>A dollar amount shown in the order's currency, at the rate fixed on the order.</summary>
    private static string Format(Order order, decimal usdAmount) =>
        order.Currency == "GEL"
            ? decimal.Round(usdAmount * order.ExchangeRate, 2).ToString("N2", Lari) + " ₾"
            : Format(usdAmount);

    /// <summary>"176,52 ₾ (= $68.00 at 2.5982)" for a lari order, plain dollars otherwise.</summary>
    private static string OwnerAmount(Order order) =>
        order.Currency == "GEL"
            ? $"{Format(order, order.Total)} (= {Format(order.Total)} at {order.ExchangeRate.ToString(CultureInfo.InvariantCulture)})"
            : Format(order.Total);

    // ---- To the shop owner ----

    public static OrderEmail OwnerNewCashOrder(Order order, string ownerAddress) => new(
        ownerAddress,
        $"New order {order.OrderNumber} - cash on delivery",
        $"""
        A new cash-on-delivery order has been placed.

          Amount    {OwnerAmount(order)}

        {OwnerCustomerBlock(order)}

        Call the customer to arrange delivery. Mark the order paid in the admin panel
        once the cash is collected.
        """);

    public static OrderEmail OwnerTransferSent(Order order, string ownerAddress)
    {
        var bank = order.TransferBank == TransferBank.BankOfGeorgia ? "Bank of Georgia" : "TBC Bank";
        return new(
            ownerAddress,
            $"Order {order.OrderNumber} - payment sent, please check",
            $"""
            Order {order.OrderNumber} is waiting for you to check the balance.

            The customer says they have sent a {bank} transfer.

              Amount    {OwnerAmount(order)}
              Reference {order.OrderNumber}  (they were asked to put this in the transfer description)

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
        {string.Join("\n", order.Items.Select(i => $"  {i.Quantity} x {i.ProductName}{Options(i)} - {Format(order, i.UnitPrice * i.Quantity)}"))}
        """;

    // ---- To the customer (null when the order has no email address) ----

    /// <summary>Cash: sent when the order is placed. Transfer: sent when the customer says they have paid.</summary>
    public static OrderEmail? CustomerOrderReceived(Order order)
    {
        var text = Texts(order);
        var intro = order.PaymentMethod == PaymentMethod.BankTransfer
            ? text.ReceivedTransfer(order)
            : text.ReceivedCash(order);
        return Customer(order, text.ReceivedSubject(order.OrderNumber), intro, withSummary: true);
    }

    /// <summary>Bank transfers only - for cash the money arrives with the delivery.</summary>
    public static OrderEmail? CustomerPaymentConfirmed(Order order)
    {
        var text = Texts(order);
        return Customer(order, text.ConfirmedSubject(order.OrderNumber), text.Confirmed(order), withSummary: true);
    }

    /// <summary>Shipped, Delivered and Cancelled; null for any other status.</summary>
    public static OrderEmail? CustomerStatusChanged(Order order)
    {
        var text = Texts(order);
        return order.Status switch
        {
            "Shipped" => Customer(order, text.ShippedSubject(order.OrderNumber), text.Shipped(order), withSummary: false),
            "Delivered" => Customer(order, text.DeliveredSubject(order.OrderNumber), text.Delivered(order), withSummary: false),
            "Cancelled" => Customer(order, text.CancelledSubject(order.OrderNumber), text.Cancelled(order), withSummary: false),
            _ => null
        };
    }

    private static OrderEmail? Customer(Order order, string subject, string intro, bool withSummary)
    {
        if (string.IsNullOrWhiteSpace(order.CustomerEmail)) return null;

        var text = Texts(order);
        var summary = withSummary
            ? $"""


                  {text.Total} {Format(order, order.Total)}

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
        Func<string, string> ReceivedSubject,
        Func<Order, string> ReceivedCash,
        Func<Order, string> ReceivedTransfer,
        Func<string, string> ConfirmedSubject,
        Func<Order, string> Confirmed,
        Func<string, string> ShippedSubject,
        Func<Order, string> Shipped,
        Func<string, string> DeliveredSubject,
        Func<Order, string> Delivered,
        Func<string, string> CancelledSubject,
        Func<Order, string> Cancelled);

    private static readonly CustomerTexts English = new(
        Hello: name => $"Hello {name},",
        SignOff: "Thank you,",
        Total: "Total",
        Items: "Items",
        DeliveringTo: "Delivering to",
        ReceivedSubject: id => $"We received your order {id}",
        ReceivedCash: o => $"Thank you for your order {o.OrderNumber}. We will call you on {o.CustomerPhone} to arrange delivery. You pay in cash when it arrives.",
        ReceivedTransfer: o => $"Thank you for your order {o.OrderNumber}. We will check the bank transfer and email you as soon as the payment arrives.",
        ConfirmedSubject: id => $"Order {id} confirmed",
        Confirmed: o => $"We have received your payment for order {o.OrderNumber}. Your order is confirmed and we will be in touch about delivery.",
        ShippedSubject: id => $"Your order {id} is on its way",
        Shipped: o => $"Good news - your order {o.OrderNumber} has been sent. We will call you on {o.CustomerPhone} if the courier needs anything.",
        DeliveredSubject: id => $"Your order {id} has been delivered",
        Delivered: o => $"Your order {o.OrderNumber} has been delivered. Thank you for shopping with SOFIO!",
        CancelledSubject: id => $"Your order {id} was cancelled",
        Cancelled: o => $"Your order {o.OrderNumber} has been cancelled. If you think this is a mistake, or you have already paid, please reply to this email.");

    private static readonly CustomerTexts Georgian = new(
        Hello: name => $"გამარჯობა, {name}!",
        SignOff: "პატივისცემით,",
        Total: "ჯამი",
        Items: "პროდუქტები",
        DeliveringTo: "მიწოდების მისამართი",
        ReceivedSubject: id => $"თქვენი შეკვეთა {id} მიღებულია",
        ReceivedCash: o => $"გმადლობთ შეკვეთისთვის {o.OrderNumber}. მიწოდების შესათანხმებლად დაგირეკავთ ნომერზე {o.CustomerPhone}. გადახდა ხდება ნაღდი ფულით, მიტანისას.",
        ReceivedTransfer: o => $"გმადლობთ შეკვეთისთვის {o.OrderNumber}. გადავამოწმებთ საბანკო გადარიცხვას და მოგწერთ, როგორც კი თანხა ჩაირიცხება.",
        ConfirmedSubject: id => $"შეკვეთა {id} დადასტურებულია",
        Confirmed: o => $"თქვენი გადახდა შეკვეთისთვის {o.OrderNumber} მიღებულია. შეკვეთა დადასტურებულია და მალე დაგიკავშირდებით მიწოდებასთან დაკავშირებით.",
        ShippedSubject: id => $"თქვენი შეკვეთა {id} გზაშია",
        Shipped: o => $"თქვენი შეკვეთა {o.OrderNumber} გამოგზავნილია. საჭიროების შემთხვევაში დაგირეკავთ ნომერზე {o.CustomerPhone}.",
        DeliveredSubject: id => $"თქვენი შეკვეთა {id} მიტანილია",
        Delivered: o => $"თქვენი შეკვეთა {o.OrderNumber} მიტანილია. გმადლობთ, რომ SOFIO აირჩიეთ!",
        CancelledSubject: id => $"თქვენი შეკვეთა {id} გაუქმდა",
        Cancelled: o => $"თქვენი შეკვეთა {o.OrderNumber} გაუქმებულია. თუ ეს შეცდომაა, ან უკვე გადაიხადეთ, გთხოვთ, უპასუხოთ ამ წერილს.");

    private static readonly CustomerTexts Russian = new(
        Hello: name => $"Здравствуйте, {name}!",
        SignOff: "С уважением,",
        Total: "Итого",
        Items: "Товары",
        DeliveringTo: "Адрес доставки",
        ReceivedSubject: id => $"Ваш заказ {id} получен",
        ReceivedCash: o => $"Спасибо за заказ {o.OrderNumber}. Мы позвоним вам по номеру {o.CustomerPhone}, чтобы договориться о доставке. Оплата наличными при получении.",
        ReceivedTransfer: o => $"Спасибо за заказ {o.OrderNumber}. Мы проверим банковский перевод и напишем вам, как только оплата поступит.",
        ConfirmedSubject: id => $"Заказ {id} подтверждён",
        Confirmed: o => $"Мы получили оплату за заказ {o.OrderNumber}. Заказ подтверждён, скоро мы свяжемся с вами по поводу доставки.",
        ShippedSubject: id => $"Ваш заказ {id} в пути",
        Shipped: o => $"Ваш заказ {o.OrderNumber} отправлен. Если курьеру что-то понадобится, мы позвоним вам по номеру {o.CustomerPhone}.",
        DeliveredSubject: id => $"Ваш заказ {id} доставлен",
        Delivered: o => $"Ваш заказ {o.OrderNumber} доставлен. Спасибо, что выбрали SOFIO!",
        CancelledSubject: id => $"Ваш заказ {id} отменён",
        Cancelled: o => $"Ваш заказ {o.OrderNumber} отменён. Если это ошибка или вы уже оплатили заказ, пожалуйста, ответьте на это письмо.");
}
