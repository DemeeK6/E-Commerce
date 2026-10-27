using MenswearStore.Api.Entities;

namespace MenswearStore.Api.DTOs;

public static class MappingExtensions
{
    public static CategoryDto ToDto(this Category category) =>
        new(category.Id, category.NameEn, category.NameKa, category.NameRu, category.Slug,
            category.GenderTarget, category.IsEnabled, category.DisplayOrder);

    public static ColorDto ToDto(this Color color) =>
        new(color.Id, color.NameEn, color.NameKa, color.NameRu, color.HexCode, color.DisplayOrder, color.IsEnabled);

    public static ProductDto ToDto(this Product product) =>
        new(
            product.Id,
            product.Name,
            product.Description,
            product.Price,
            product.DiscountPrice,
            product.Category?.ToDto(),
            product.GenderTarget,
            product.Sizes.OrderBy(size => size.Id).Select(size => size.Name).ToArray(),
            product.Colors.OrderBy(pc => pc.Id).Select(pc => new ProductColorDto(
                pc.Id, pc.ColorId,
                pc.Color?.NameEn ?? "", pc.Color?.NameKa ?? "", pc.Color?.NameRu ?? "",
                pc.Color?.HexCode ?? "#111111")).ToArray(),
            product.Images.OrderByDescending(image => image.IsPrimary).ThenBy(image => image.SortOrder)
                .Select(image => new ProductImageDto(image.Id, image.Url, image.AltText, image.IsPrimary, image.SortOrder, image.ColorId, image.FocusX, image.FocusY)).ToArray(),
            product.IsActive);

    public static CartDto ToDto(this Cart cart)
    {
        var items = cart.Items.Select(item =>
        {
            var imageUrl = item.Product?.Images.OrderByDescending(image => image.IsPrimary).ThenBy(image => image.SortOrder).FirstOrDefault()?.Url;
            return new CartItemDto(
                item.Id,
                item.ProductId,
                item.Product?.Name ?? "Product",
                imageUrl,
                item.Quantity,
                item.Size,
                item.Color,
                item.UnitPrice,
                item.UnitPrice * item.Quantity);
        }).ToArray();

        var subtotal = items.Sum(item => item.LineTotal);
        return new CartDto(cart.Id, items, subtotal, subtotal);
    }

    public static BankAccountDto ToDto(this BankAccount account) =>
        new(account.Id, account.Bank, account.AccountHolder, account.Iban,
            account.Currencies, account.IsEnabled, account.DisplayOrder);

    public static InfoSectionDto ToDto(this InfoSection section) =>
        new(section.Id, section.Key,
            section.TitleEn, section.TitleKa, section.TitleRu,
            section.BodyEn, section.BodyKa, section.BodyRu,
            section.IsEnabled, section.DisplayOrder);

    public static HomeHeroDto ToDto(this HomeHero hero, bool includeDisabled) =>
        new(hero.EyebrowEn, hero.EyebrowKa, hero.EyebrowRu,
            hero.TitleEn, hero.TitleKa, hero.TitleRu,
            hero.SubtitleEn, hero.SubtitleKa,
            hero.SlideIntervalSeconds,
            hero.Slides
                .Where(slide => includeDisabled || slide.IsEnabled)
                .OrderBy(slide => slide.DisplayOrder)
                .Select(slide => new HeroSlideDto(slide.Id, slide.ImageUrl, slide.IsEnabled, slide.DisplayOrder, slide.FocusX, slide.FocusY))
                .ToArray());

    public static AppSettingDto ToDto(this AppSetting setting) =>
        new(setting.Id, setting.Key, setting.Name, setting.IsEnabled, setting.Value, setting.Kind);

    public static OrderDto ToDto(this Order order) =>
        new(
            order.Id,
            order.OrderNumber,
            // Falls back to the address typed at checkout so a guest order still shows a
            // contact in every list that used to print the account email.
            order.User?.Email ?? (string.IsNullOrWhiteSpace(order.CustomerEmail) ? "-" : order.CustomerEmail),
            order.UserId is null,
            order.CustomerFirstName,
            order.CustomerLastName,
            order.CustomerPhone,
            order.CustomerEmail,
            order.ShippingAddress,
            order.PaymentMethod,
            order.PaymentStatus,
            order.TransferBank,
            order.CustomerConfirmedPaymentAtUtc,
            order.PublicToken,
            order.Status,
            order.Total,
            order.Currency,
            order.ExchangeRate,
            order.TotalInCurrency,
            order.CreatedAtUtc,
            order.Items.Select(item => new OrderItemDto(
                item.Id, item.ProductId, item.ProductName,
                item.Quantity, item.UnitPrice, item.Size, item.Color)).ToArray());
}
