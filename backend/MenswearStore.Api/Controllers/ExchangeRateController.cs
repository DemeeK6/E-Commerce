using MenswearStore.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace MenswearStore.Api.Controllers;

[ApiController]
[Route("api/exchange-rate")]
public class ExchangeRateController(ExchangeRateService rates) : ControllerBase
{
    /// <summary>
    /// Today's official USD to GEL rate. 503 when the National Bank has not answered yet;
    /// the shop then shows dollars only.
    /// </summary>
    [AllowAnonymous]
    [HttpGet]
    public async Task<ActionResult<ExchangeRate>> Get(CancellationToken cancellationToken)
    {
        var rate = await rates.GetUsdToGelAsync(cancellationToken);
        return rate is null
            ? StatusCode(StatusCodes.Status503ServiceUnavailable, new { message = "Exchange rate unavailable." })
            : rate;
    }
}
