using System.Security.Cryptography;
using MenswearStore.Api.Data;
using Microsoft.EntityFrameworkCore;

namespace MenswearStore.Api.Services;

/// <summary>
/// Makes order numbers like ON-261018-4827: "ON" (order number) prefix, the order date in Tbilisi
/// (yyMMdd), then four random digits. Digits only after the prefix, so a customer can
/// type it into a bank app without mixing up letters.
/// </summary>
public static class OrderNumberGenerator
{
    // Georgia is UTC+4 all year (no daylight saving), so a fixed offset is exact and
    // does not depend on the server having time zone data installed.
    private static readonly TimeSpan Tbilisi = TimeSpan.FromHours(4);

    public static async Task<string> NextAsync(ApplicationDbContext db, CancellationToken cancellationToken = default)
    {
        var date = DateTime.UtcNow.Add(Tbilisi).ToString("yyMMdd");

        // 10,000 numbers a day, so a clash is rare; try a few, then fall back to five
        // digits rather than fail the order. The unique index is the final guarantee.
        for (var attempt = 0; attempt < 20; attempt++)
        {
            var digits = attempt < 10 ? 4 : 5;
            var random = RandomNumberGenerator.GetInt32(0, (int)Math.Pow(10, digits)).ToString($"D{digits}");
            var candidate = $"ON-{date}-{random}";
            if (!await db.Orders.AnyAsync(order => order.OrderNumber == candidate, cancellationToken))
            {
                return candidate;
            }
        }

        throw new InvalidOperationException("Could not find a free order number.");
    }
}
