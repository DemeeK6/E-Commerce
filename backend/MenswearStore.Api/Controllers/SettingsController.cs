using MenswearStore.Api.Data;
using MenswearStore.Api.DTOs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace MenswearStore.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class SettingsController(ApplicationDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<AppSettingDto>>> Get()
    {
        var settings = await db.AppSettings.OrderBy(setting => setting.Id).ToListAsync();
        return settings.Select(setting => setting.ToDto()).ToArray();
    }

    [Authorize(Roles = "Admin")]
    [HttpPut("{key}")]
    public async Task<ActionResult<AppSettingDto>> Update(string key, UpdateSettingRequest request)
    {
        var setting = await db.AppSettings.FirstOrDefaultAsync(setting => setting.Key == key);
        if (setting is null)
        {
            return NotFound();
        }

        setting.IsEnabled = request.IsEnabled;
        setting.UpdatedAtUtc = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return setting.ToDto();
    }
}
