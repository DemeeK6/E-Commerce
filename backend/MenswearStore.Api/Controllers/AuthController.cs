using System.Security.Claims;
using MenswearStore.Api.DTOs;
using MenswearStore.Api.Entities;
using MenswearStore.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;

namespace MenswearStore.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController(
    UserManager<ApplicationUser> userManager,
    SignInManager<ApplicationUser> signInManager,
    TokenService tokenService) : ControllerBase
{
    [HttpPost("register")]
    public async Task<ActionResult<AuthResponse>> Register(RegisterRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrWhiteSpace(request.Password))
        {
            return BadRequest(new { message = "Email and password are required." });
        }

        if (string.IsNullOrWhiteSpace(request.Phone))
        {
            return BadRequest(new { message = "Phone number is required." });
        }

        var user = new ApplicationUser
        {
            UserName = request.Email,
            Email = request.Email,
            FirstName = request.FirstName,
            LastName = request.LastName,
            // Stored as typed. Any format is accepted and nothing is verified - a deliberate
            // choice, so international and local numbers both work.
            PhoneNumber = request.Phone.Trim()
        };

        var result = await userManager.CreateAsync(user, request.Password);
        if (!result.Succeeded)
        {
            return BadRequest(new { errors = result.Errors.Select(error => error.Description) });
        }

        await userManager.AddToRoleAsync(user, "Customer");
        return await AuthResult(user);
    }

    [HttpPost("login")]
    public async Task<ActionResult<AuthResponse>> Login(LoginRequest request)
    {
        var user = await userManager.FindByEmailAsync(request.Email);
        if (user is null)
        {
            return Unauthorized(new { message = "Invalid email or password." });
        }

        var result = await signInManager.CheckPasswordSignInAsync(user, request.Password, false);
        if (!result.Succeeded)
        {
            return Unauthorized(new { message = "Invalid email or password." });
        }

        return await AuthResult(user);
    }

    [Authorize]
    [HttpGet("me")]
    public async Task<ActionResult<UserDto>> Me()
    {
        var user = await userManager.FindByIdAsync(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        if (user is null)
        {
            return Unauthorized();
        }

        return await UserDto(user);
    }

    [Authorize]
    [HttpPost("logout")]
    public ActionResult Logout() => Ok(new { message = "Logged out." });

    [HttpPost("reset-password")]
    public ActionResult ResetPassword(ResetPasswordRequest request) =>
        Ok(new { message = $"Password reset flow for {request.Email} will be connected to email delivery later." });

    [HttpPost("google-login")]
    public ActionResult GoogleLogin(GoogleLoginRequest request) =>
        StatusCode(StatusCodes.Status501NotImplemented, new { message = "Google login endpoint is prepared. Add OAuth client validation before enabling it." });

    private async Task<AuthResponse> AuthResult(ApplicationUser user) =>
        new(await tokenService.CreateTokenAsync(user), await UserDto(user));

    private async Task<UserDto> UserDto(ApplicationUser user) =>
        new(user.Id, user.Email ?? string.Empty, user.FirstName, user.LastName, user.PhoneNumber ?? string.Empty, (await userManager.GetRolesAsync(user)).ToArray());
}
