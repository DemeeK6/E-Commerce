namespace MenswearStore.Api.DTOs;

public record RegisterRequest(string Email, string Password, string FirstName, string LastName);
public record LoginRequest(string Email, string Password);
public record ResetPasswordRequest(string Email);
public record GoogleLoginRequest(string IdToken);
public record AuthResponse(string Token, UserDto User);
public record UserDto(string Id, string Email, string FirstName, string LastName, IReadOnlyList<string> Roles);
