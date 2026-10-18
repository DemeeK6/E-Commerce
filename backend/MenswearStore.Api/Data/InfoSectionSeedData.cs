using MenswearStore.Api.Entities;

namespace MenswearStore.Api.Data;

/// <summary>
/// Starting text for the public Info page, kept out of DataSeeder so the prose is easy
/// to read and edit. It describes only what the shop demonstrably does today - how an
/// order is paid for and how delivery is arranged. It deliberately claims no delivery
/// window and no returns policy, because those are the owner's to state, and she edits
/// all of this from the admin panel.
/// </summary>
public static class InfoSectionSeedData
{
    public static IReadOnlyList<InfoSection> Sections { get; } = new[]
    {
        new InfoSection
        {
            Key = "delivery",
            DisplayOrder = 1,
            IsEnabled = true,
            TitleEn = "Delivery",
            TitleKa = "მიწოდება",
            TitleRu = "Доставка",
            BodyEn = "We deliver locally across Georgia.\n\nAfter you place an order we call you on the phone number you gave at checkout to agree a delivery time and confirm your address.",
            BodyKa = "მიწოდება ხორციელდება საქართველოს მასშტაბით.\n\nშეკვეთის გაფორმების შემდეგ დაგიკავშირდებით იმ ნომერზე, რომელიც შეკვეთისას მიუთითეთ, რათა შევათანხმოთ მიწოდების დრო და დავაზუსტოთ მისამართი.",
            BodyRu = "Мы доставляем по всей Грузии.\n\nПосле оформления заказа мы позвоним вам по номеру, указанному при заказе, чтобы согласовать время доставки и подтвердить адрес.",
        },
        new InfoSection
        {
            Key = "payment",
            DisplayOrder = 2,
            IsEnabled = true,
            TitleEn = "Payment",
            TitleKa = "გადახდა",
            TitleRu = "Оплата",
            BodyEn = "You can pay cash on delivery, or by bank transfer to our TBC Bank or Bank of Georgia account.\n\nIf you choose bank transfer, the account details and your order number are shown as soon as you place the order. Please put the order number in the transfer description — without it we cannot match your payment to your order.\n\nWe confirm your order once the payment reaches us, and email you.",
            BodyKa = "გადაიხდით ნაღდი ანგარიშსწორებით მიწოდებისას, ან საბანკო გადარიცხვით თიბისი ბანკის ან საქართველოს ბანკის ანგარიშზე.\n\nთუ აირჩევთ საბანკო გადარიცხვას, ანგარიშის მონაცემები და შეკვეთის ნომერი გამოჩნდება შეკვეთის გაფორმებისთანავე. გთხოვთ, მიუთითოთ შეკვეთის ნომერი დანიშნულებაში — ამის გარეშე ვერ დავაკავშირებთ გადახდას თქვენს შეკვეთასთან.\n\nთანხის მიღებისთანავე დაგიდასტურებთ შეკვეთას და გამოგიგზავნით ელ-ფოსტას.",
            BodyRu = "Вы можете оплатить наличными при доставке или банковским переводом на наш счёт в Банке ТБС или Банке Грузии.\n\nЕсли вы выберете банковский перевод, реквизиты счёта и номер заказа появятся сразу после оформления. Пожалуйста, укажите номер заказа в назначении перевода — без этого мы не сможем связать оплату с вашим заказом.\n\nМы подтвердим заказ, как только получим оплату, и отправим вам письмо.",
        },
    };
}
