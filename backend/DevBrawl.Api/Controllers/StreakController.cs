using System.Security.Claims;
using DevBrawl.Common.Progression;
using DevBrawl.Infrastructure.Services.Contracts;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.IdentityModel.JsonWebTokens;

namespace DevBrawl.Api.Controllers;

// The logged-in player's learning streak, for the header on the main page
[ApiController]
[Authorize]
[Route("api/[controller]")]
public class StreakController(ILearningStreakService streaks) : ControllerBase
{
    [HttpGet]
    [ProducesResponseType<Streak>(StatusCodes.Status200OK)]
    public async Task<ActionResult<Streak>> Get(CancellationToken cancellationToken) =>
        Guid.TryParse(User.FindFirstValue(JwtRegisteredClaimNames.Sub), out var userId)
            ? await streaks.GetAsync(userId, cancellationToken)
            : Unauthorized();
}
