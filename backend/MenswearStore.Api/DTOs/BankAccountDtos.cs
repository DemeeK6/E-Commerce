using System.ComponentModel.DataAnnotations;
using MenswearStore.Api.Entities;

namespace MenswearStore.Api.DTOs;

public record BankAccountDto(
    int Id,
    TransferBank Bank,
    string AccountHolder,
    string Iban,
    string Currencies,
    bool IsEnabled,
    int DisplayOrder);

public record UpsertBankAccountRequest(
    TransferBank Bank,
    [Required] string AccountHolder,
    [Required] string Iban,
    string? Currencies,
    bool IsEnabled,
    int DisplayOrder);
