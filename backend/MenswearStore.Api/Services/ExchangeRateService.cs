using System.Text.Json;

namespace MenswearStore.Api.Services;

/// <summary>How many lari one US dollar costs, and the day the National Bank set it for.</summary>
public record ExchangeRate(decimal UsdToGel, DateOnly ValidFrom);

/// <summary>
/// The official USD to GEL rate from the National Bank of Georgia, which publishes one
/// rate a day. Fetched at most once an hour and kept in memory. If the bank cannot be
/// reached the last good rate is kept; if there has never been one, callers get null
/// and the shop shows dollars only rather than a made-up lari price.
/// </summary>
public class ExchangeRateService(IHttpClientFactory httpClientFactory, ILogger<ExchangeRateService> logger)
{
    private const string NbgUrl = "https://nbg.gov.ge/gw/api/ct/monetarypolicy/currencies/en/json/?currencies=USD";
    private static readonly TimeSpan RefreshAfter = TimeSpan.FromHours(1);
    private static readonly TimeSpan RetryAfterFailure = TimeSpan.FromMinutes(5);

    private readonly SemaphoreSlim _lock = new(1, 1);
    private ExchangeRate? _rate;
    private DateTime _nextRefreshUtc = DateTime.MinValue;

    public async Task<ExchangeRate?> GetUsdToGelAsync(CancellationToken cancellationToken = default)
    {
        if (DateTime.UtcNow < _nextRefreshUtc) return _rate;

        await _lock.WaitAsync(cancellationToken);
        try
        {
            // Another request may have refreshed it while this one waited.
            if (DateTime.UtcNow < _nextRefreshUtc) return _rate;

            try
            {
                _rate = await FetchAsync(cancellationToken);
                _nextRefreshUtc = DateTime.UtcNow + RefreshAfter;
                logger.LogInformation("USD to GEL rate {Rate} valid from {Date}.", _rate.UsdToGel, _rate.ValidFrom);
            }
            catch (Exception exception) when (exception is not OperationCanceledException || !cancellationToken.IsCancellationRequested)
            {
                // Keep whatever rate there was and try again soon, rather than on every request.
                _nextRefreshUtc = DateTime.UtcNow + RetryAfterFailure;
                logger.LogWarning(exception, "Could not fetch the USD to GEL rate; keeping {Rate}.",
                    _rate?.UsdToGel.ToString() ?? "none");
            }

            return _rate;
        }
        finally
        {
            _lock.Release();
        }
    }

    private async Task<ExchangeRate> FetchAsync(CancellationToken cancellationToken)
    {
        var client = httpClientFactory.CreateClient(nameof(ExchangeRateService));
        client.Timeout = TimeSpan.FromSeconds(10);

        // Shape: [{ "currencies": [{ "code": "USD", "quantity": 1, "rate": 2.5982, "validFromDate": "..." }] }]
        await using var stream = await client.GetStreamAsync(NbgUrl, cancellationToken);
        using var document = await JsonDocument.ParseAsync(stream, cancellationToken: cancellationToken);
        var usd = document.RootElement[0].GetProperty("currencies")[0];

        var rate = usd.GetProperty("rate").GetDecimal() / usd.GetProperty("quantity").GetDecimal();
        if (rate <= 0) throw new InvalidOperationException($"Unexpected USD rate {rate}.");

        var validFrom = DateOnly.FromDateTime(usd.GetProperty("validFromDate").GetDateTime());
        return new ExchangeRate(decimal.Round(rate, 4), validFrom);
    }
}
