using System.Diagnostics;
using System.Security.Claims;
using DevBrawl.Auth;
using DevBrawl.Auth.Domain;
using DevBrawl.Auth.Dtos;
using DevBrawl.Infrastructure.Services.Contracts;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.IdentityModel.JsonWebTokens;

namespace DevBrawl.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController(IAuthService authService, IGoogleTokenValidator google, ISeasonService seasons) : ControllerBase
{
    // The Google client ID for the sign-in button; null hides the button
    [HttpGet("google/config")]
    [ProducesResponseType<GoogleConfigResponse>(StatusCodes.Status200OK)]
    public GoogleConfigResponse GoogleConfig() => new(google.ClientId);

    [HttpPost("google")]
    [ProducesResponseType<GoogleLoginResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status503ServiceUnavailable)]
    public async Task<IActionResult> Google(GoogleLoginRequest request, CancellationToken cancellationToken)
    {
        var result = await authService.GoogleLoginAsync(request, cancellationToken);
        return result.Error is null ? Ok(result.Response) : ToProblem(result.Error.Value);
    }

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

    [Authorize]
    [HttpPut("nickname")]
    [ProducesResponseType<AuthResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict)]
    public Task<IActionResult> ChangeNickname(ChangeNicknameRequest request, CancellationToken cancellationToken) =>
        ForCurrentUser(userId => authService.ChangeNicknameAsync(userId, request, cancellationToken));

    [Authorize]
    [HttpPut("email")]
    [ProducesResponseType<AuthResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict)]
    public Task<IActionResult> ChangeEmail(ChangeEmailRequest request, CancellationToken cancellationToken) =>
        ForCurrentUser(userId => authService.ChangeEmailAsync(userId, request, cancellationToken));

    [Authorize]
    [HttpPut("password")]
    [ProducesResponseType<AuthResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
    public Task<IActionResult> ChangePassword(ChangePasswordRequest request, CancellationToken cancellationToken) =>
        ForCurrentUser(userId => authService.ChangePasswordAsync(userId, request, cancellationToken));

    [Authorize]
    [HttpPut("avatar")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> ChangeAvatar(ChangeAvatarRequest request, CancellationToken cancellationToken)
    {
        if (!Guid.TryParse(User.FindFirstValue(JwtRegisteredClaimNames.Sub), out var userId))
            return Unauthorized();
        if (!await seasons.CanUseAvatarAsync(userId, request.AvatarId, cancellationToken))
            return Problem("This avatar is locked. Unlock it in the season pass.", statusCode: StatusCodes.Status403Forbidden);
        return await authService.ChangeAvatarAsync(userId, request, cancellationToken) ? NoContent() : Unauthorized();
    }

    [Authorize]
    [HttpPut("tag")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> ChangeTag(ChangeTagRequest request, CancellationToken cancellationToken)
    {
        if (!Guid.TryParse(User.FindFirstValue(JwtRegisteredClaimNames.Sub), out var userId))
            return Unauthorized();
        if (request.Tag is not null && !await seasons.CanUseTagAsync(userId, request.Tag, cancellationToken))
            return Problem("This tag is locked. Unlock it in the season pass.", statusCode: StatusCodes.Status403Forbidden);
        return await authService.ChangeTagAsync(userId, request.Tag, cancellationToken) ? NoContent() : Unauthorized();
    }

    private async Task<IActionResult> ForCurrentUser(Func<Guid, Task<AuthResult>> change)
    {
        if (!Guid.TryParse(User.FindFirstValue(JwtRegisteredClaimNames.Sub), out var userId))
            return Unauthorized();
        return ToActionResult(await change(userId));
    }

    private IActionResult ToActionResult(AuthResult result, int successStatusCode = StatusCodes.Status200OK) =>
        result.Error is null ? StatusCode(successStatusCode, result.Response) : ToProblem(result.Error.Value);

    private ObjectResult ToProblem(AuthError error) =>
        error switch
        {
            AuthError.EmailTaken => Problem("An account with this email already exists.", statusCode: StatusCodes.Status409Conflict),
            AuthError.NicknameTaken => Problem("This nickname is already taken.", statusCode: StatusCodes.Status409Conflict),
            AuthError.InvalidCredentials => Problem("Invalid email or password.", statusCode: StatusCodes.Status401Unauthorized),
            AuthError.InvalidRefreshToken => Problem("Refresh token is invalid or expired.", statusCode: StatusCodes.Status401Unauthorized),
            // 400, not 401: the frontend treats a 401 as an expired session and refreshes the tokens
            AuthError.WrongPassword => Problem("Your current password is incorrect.", statusCode: StatusCodes.Status400BadRequest),
            AuthError.UserNotFound => Problem("Account not found.", statusCode: StatusCodes.Status401Unauthorized),
            AuthError.InvalidGoogleToken => Problem("Google sign-in didn't work. Try again.", statusCode: StatusCodes.Status400BadRequest),
            AuthError.GoogleNotConfigured => Problem("Google sign-in isn't set up on this server.", statusCode: StatusCodes.Status503ServiceUnavailable),
            _ => throw new UnreachableException()
        };
}
