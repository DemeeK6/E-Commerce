using System.ComponentModel.DataAnnotations;
using MenswearStore.Api.Entities;

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
    bool IsGuest,
    string CustomerFirstName,
    string CustomerLastName,
    string CustomerPhone,
    string CustomerEmail,
    string ShippingAddress,
    PaymentMethod PaymentMethod,
    PaymentStatus PaymentStatus,
    TransferBank? TransferBank,
    DateTime? CustomerConfirmedPaymentAtUtc,
    Guid PublicToken,
    string Status,
    decimal Total,
    DateTime CreatedAtUtc,
    OrderItemDto[] Items);

/// <summary>
/// One line the browser asks to order. Price is deliberately absent: the server looks the
/// product up and uses its own current price, so a tampered client cannot set what it pays.
/// </summary>
public record CreateOrderItemRequest(int ProductId, int Quantity, string? Size, string? Color);

public record CreateOrderRequest(
    [Required] string FirstName,
    [Required] string LastName,
    [Required] string Phone,
    [Required] string Address,
    string? Email,
    PaymentMethod PaymentMethod,
    /// <summary>Required when PaymentMethod is BankTransfer; ignored otherwise.</summary>
    TransferBank? TransferBank,
    CreateOrderItemRequest[] Items);

public record UpdateOrderStatusRequest([Required] string Status);

public record UpdatePaymentStatusRequest([Required] PaymentStatus PaymentStatus, string? PaymentReference);

/// <summary>Proves the caller is the one who placed the order.</summary>
public record OrderTokenRequest([Required] Guid PublicToken);
