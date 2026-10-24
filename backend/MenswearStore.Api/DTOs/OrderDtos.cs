using System.ComponentModel.DataAnnotations;
using MenswearStore.Api.Entities;

namespace MenswearStore.Api.DTOs;

public record OrderItemDto(
    int Id,
    int? ProductId,
    string ProductName,
    int Quantity,
    decimal UnitPrice,
    string Size,
    string Color);

public record OrderDto(
    int Id,
    string OrderNumber,
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
    string Currency,
    decimal ExchangeRate,
    decimal TotalInCurrency,
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
    /// <summary>Required - checked in the controller so the customer gets a readable message.</summary>
    string? Email,
    PaymentMethod PaymentMethod,
    /// <summary>Required when PaymentMethod is BankTransfer; ignored otherwise.</summary>
    TransferBank? TransferBank,
    CreateOrderItemRequest[] Items,
    /// <summary>"en", "ka" or "ru"; anything else is stored as "en".</summary>
    string? Language = null,
    /// <summary>"USD" or "GEL"; the server applies its own rate, never one sent by the browser.</summary>
    string? Currency = null);

public record UpdateOrderStatusRequest([Required] string Status);

public record UpdatePaymentStatusRequest([Required] PaymentStatus PaymentStatus, string? PaymentReference);

/// <summary>Proves the caller is the one who placed the order.</summary>
public record OrderTokenRequest([Required] Guid PublicToken);
