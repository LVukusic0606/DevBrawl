using System.Diagnostics;
using System.Security.Claims;
using DevBrawl.Auth;
using DevBrawl.Auth.Dtos;
using DevBrawl.Infrastructure.Services.Contracts;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.IdentityModel.JsonWebTokens;

namespace DevBrawl.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController(IAuthService authService) : ControllerBase
{
    [HttpPost("signup")]
    [ProducesResponseType<AuthResponse>(StatusCodes.Status201Created)]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Signup(SignupRequest request, CancellationToken cancellationToken) =>
        ToActionResult(await authService.SignupAsync(request, cancellationToken), StatusCodes.Status201Created);

    [HttpPost("login")]
    [ProducesResponseType<AuthResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> Login(LoginRequest request, CancellationToken cancellationToken) =>
        ToActionResult(await authService.LoginAsync(request, cancellationToken));

    [HttpPost("refresh")]
    [ProducesResponseType<AuthResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> Refresh(RefreshRequest request, CancellationToken cancellationToken) =>
        ToActionResult(await authService.RefreshAsync(request.RefreshToken, cancellationToken));

    [HttpPost("logout")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> Logout(RefreshRequest request, CancellationToken cancellationToken)
    {
        await authService.LogoutAsync(request.RefreshToken, cancellationToken);
        return NoContent();
    }

    [Authorize]
    [HttpGet("me")]
    [ProducesResponseType<UserResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<UserResponse>> Me(CancellationToken cancellationToken)
    {
        if (!Guid.TryParse(User.FindFirstValue(JwtRegisteredClaimNames.Sub), out var userId))
            return Unauthorized();

        var user = await authService.GetUserAsync(userId, cancellationToken);
        return user is null ? Unauthorized() : user;
    }

    private IActionResult ToActionResult(AuthResult result, int successStatusCode = StatusCodes.Status200OK) =>
        result.Error switch
        {
            null => StatusCode(successStatusCode, result.Response),
            AuthError.EmailTaken => Problem("An account with this email already exists.", statusCode: StatusCodes.Status409Conflict),
            AuthError.NicknameTaken => Problem("This nickname is already taken.", statusCode: StatusCodes.Status409Conflict),
            AuthError.InvalidCredentials => Problem("Invalid email or password.", statusCode: StatusCodes.Status401Unauthorized),
            AuthError.InvalidRefreshToken => Problem("Refresh token is invalid or expired.", statusCode: StatusCodes.Status401Unauthorized),
            _ => throw new UnreachableException()
        };
}
