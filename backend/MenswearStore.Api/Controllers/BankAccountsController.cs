using MenswearStore.Api.Data;
using MenswearStore.Api.DTOs;
using MenswearStore.Api.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace MenswearStore.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class BankAccountsController(ApplicationDbContext db) : ControllerBase
{
    /// <summary>
    /// Anonymous on purpose: a guest at checkout must be able to read the account to pay into.
    /// Only enabled accounts are public; `includeDisabled` is honoured for admins only, matching
    /// the pattern used by categories and colours.
    /// </summary>
    [AllowAnonymous]
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<BankAccountDto>>> Get(bool includeDisabled = false)
    {
        var query = db.BankAccounts.AsQueryable();
        if (!User.IsInRole("Admin") || !includeDisabled)
        {
            query = query.Where(account => account.IsEnabled);
        }

        var accounts = await query.OrderBy(account => account.DisplayOrder).ToListAsync();
        return accounts.Select(account => account.ToDto()).ToArray();
    }

    [Authorize(Roles = "Admin")]
    [HttpPut("{id:int}")]
    public async Task<ActionResult<BankAccountDto>> Update(int id, UpsertBankAccountRequest request)
    {
        var account = await db.BankAccounts.FindAsync(id);
        if (account is null) return NotFound();

        var error = Validate(request);
        if (error is not null) return BadRequest(new { message = error });

        account.AccountHolder = request.AccountHolder.Trim();
        account.Iban = request.Iban.Trim().Replace(" ", string.Empty).ToUpperInvariant();
        account.Currencies = request.Currencies?.Trim() ?? string.Empty;
        account.IsEnabled = request.IsEnabled;
        account.DisplayOrder = request.DisplayOrder;
        account.UpdatedAtUtc = DateTime.UtcNow;

        await db.SaveChangesAsync();
        return account.ToDto();
    }

    private static string? Validate(UpsertBankAccountRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.AccountHolder))
            return "Account holder is required.";

        var iban = request.Iban?.Trim().Replace(" ", string.Empty) ?? string.Empty;
        if (string.IsNullOrWhiteSpace(iban))
            return "IBAN is required.";

        // Deliberately loose: enough to catch a typo, not so strict that a valid
        // foreign account is rejected.
        if (iban.Length is < 15 or > 34)
            return "IBAN looks wrong - it should be between 15 and 34 characters.";

        return null;
    }
}
