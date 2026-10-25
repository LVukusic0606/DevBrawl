using System.Security.Claims;
using DevBrawl.Infrastructure.Profiles;
using DevBrawl.Infrastructure.Services.Contracts;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.IdentityModel.JsonWebTokens;

namespace DevBrawl.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/[controller]")]
public class ProfilesController(IProfileService profiles) : ControllerBase
{
    [HttpGet("me")]
    [ProducesResponseType<ProfileResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<ProfileResponse>> GetMine(CancellationToken cancellationToken)
    {
        if (!TryGetUserId(out var userId))
            return Unauthorized();
        var profile = await profiles.GetAsync(userId, userId, cancellationToken);
        return profile is null ? Unauthorized() : profile;
    }

    // Any player's public profile, e.g. from a leaderboard or after a duel
    [HttpGet("{userId:guid}")]
    [ProducesResponseType<ProfileResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ProfileResponse>> Get(Guid userId, CancellationToken cancellationToken)
    {
        if (!TryGetUserId(out var requesterId))
            return Unauthorized();

        var profile = await profiles.GetAsync(userId, requesterId, cancellationToken);
        return profile is null ? Problem("Player not found.", statusCode: StatusCodes.Status404NotFound) : profile;
    }

    private bool TryGetUserId(out Guid userId) =>
        Guid.TryParse(User.FindFirstValue(JwtRegisteredClaimNames.Sub), out userId);
}
