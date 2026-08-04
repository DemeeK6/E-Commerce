namespace MenswearStore.Api.DTOs;

public record CartDto(int Id, IReadOnlyList<CartItemDto> Items, decimal Subtotal, decimal Total);

public record CartItemDto(
    int Id,
    int ProductId,
    string ProductName,
    string? ImageUrl,
    int Quantity,
    string Size,
    string Color,
    decimal UnitPrice,
    decimal LineTotal);

public record AddCartItemRequest(int ProductId, int Quantity, string Size, string Color, string? GuestId);
public record UpdateCartItemRequest(int Quantity, string? GuestId);
