using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace MenswearStore.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Admin")]
public class UploadsController(IWebHostEnvironment env) : ControllerBase
{
    private static readonly string[] AllowedExtensions = [".jpg", ".jpeg", ".png", ".webp", ".gif"];
    private const long MaxBytes = 25 * 1024 * 1024; // 25 MB

    // The request may be a little larger than the photo limit, so a photo just over
    // 25 MB reaches the check below and gets a clear message instead of a generic
    // error. (The server's own default cap, about 28.6 MB, is replaced here.)
    private const long MaxRequestBytes = MaxBytes + 5 * 1024 * 1024;

    [HttpPost("image")]
    [RequestSizeLimit(MaxRequestBytes)]
    [RequestFormLimits(MultipartBodyLengthLimit = MaxRequestBytes)]
    public async Task<ActionResult<object>> UploadImage(IFormFile file)
    {
        if (file.Length == 0)
            return BadRequest(new { message = "File is empty." });

        if (file.Length > MaxBytes)
            return BadRequest(new { message = "File exceeds 25 MB limit." });

        var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (!AllowedExtensions.Contains(ext))
            return BadRequest(new { message = $"File type not allowed. Use: {string.Join(", ", AllowedExtensions)}" });

        var uploadsDir = Path.Combine(env.WebRootPath ?? env.ContentRootPath, "uploads");
        Directory.CreateDirectory(uploadsDir);

        var fileName = $"{Guid.NewGuid()}{ext}";
        var filePath = Path.Combine(uploadsDir, fileName);

        await using var stream = System.IO.File.Create(filePath);
        await file.CopyToAsync(stream);

        var url = $"/uploads/{fileName}";
        return Ok(new { url });
    }
}
