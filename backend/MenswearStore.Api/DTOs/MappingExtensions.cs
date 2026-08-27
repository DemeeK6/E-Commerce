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
                .Select(image => new ProductImageDto(image.Id, image.Url, image.AltText, image.IsPrimary, image.SortOrder, image.ColorId)).ToArray(),
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

    public static AppSettingDto ToDto(this AppSetting setting) =>
        new(setting.Id, setting.Key, setting.Name, setting.IsEnabled);

    public static OrderDto ToDto(this Order order) =>
        new(
            order.Id,
            order.User?.Email ?? order.UserId,
            order.Status,
            order.Total,
            order.CreatedAtUtc,
            order.Items.Select(item => new OrderItemDto(
                item.Id, item.ProductId, item.ProductName,
                item.Quantity, item.UnitPrice, item.Size, item.Color)).ToArray());
}
