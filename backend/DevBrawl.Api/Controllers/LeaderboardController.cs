using System.Security.Claims;
using DevBrawl.Infrastructure.Leaderboard;
using DevBrawl.Infrastructure.Services.Contracts;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.IdentityModel.JsonWebTokens;

namespace DevBrawl.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/[controller]")]
public class LeaderboardController(ILeaderboardService leaderboard) : ControllerBase
{
    private const int MaxLimit = 100;

    // Overall leaderboard: average rating across all categories
    [HttpGet]
    [ProducesResponseType<LeaderboardResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<LeaderboardResponse>> GetOverall(CancellationToken cancellationToken, int limit = 50)
    {
        if (!Guid.TryParse(User.FindFirstValue(JwtRegisteredClaimNames.Sub), out var userId))
            return Unauthorized();
        return await leaderboard.GetOverallAsync(userId, Math.Clamp(limit, 1, MaxLimit), cancellationToken);
    }
}
