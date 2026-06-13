using System.ComponentModel.DataAnnotations;

namespace MenswearStore.Api.DTOs;

public record OrderItemDto(
    int Id,
    int ProductId,
    string ProductName,
    int Quantity,
    decimal UnitPrice,
    string Size,
    string Color);

public record OrderDto(
    int Id,
    string UserEmail,
    string Status,
    decimal Total,
    DateTime CreatedAtUtc,
    OrderItemDto[] Items);

public record CreateOrderRequest;

public record UpdateOrderStatusRequest([Required] string Status);
