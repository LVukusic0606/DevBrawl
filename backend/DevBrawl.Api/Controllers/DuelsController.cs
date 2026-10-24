using System.Security.Claims;
using DevBrawl.Duel.Dtos;
using DevBrawl.Infrastructure.Services.Contracts;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.IdentityModel.JsonWebTokens;

namespace DevBrawl.Api.Controllers;

// Duel history. Playing a duel goes through the SignalR hub at /hubs/duel.
[ApiController]
[Authorize]
[Route("api/[controller]")]
public class DuelsController(IDuelHistoryService history) : ControllerBase
{
    private const int MaxLimit = 50;

    [HttpGet]
    [ProducesResponseType<List<DuelSummaryResponse>>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<List<DuelSummaryResponse>>> GetMine(CancellationToken cancellationToken, int limit = 20)
    {
        if (!TryGetUserId(out var userId))
            return Unauthorized();
        return await history.GetForUserAsync(userId, Math.Clamp(limit, 1, MaxLimit), cancellationToken);
    }

    [HttpGet("{id:guid}")]
    [ProducesResponseType<DuelDetailsResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<DuelDetailsResponse>> GetById(Guid id, CancellationToken cancellationToken)
    {
        if (!TryGetUserId(out var userId))
            return Unauthorized();

        // Someone else's duel is reported as missing rather than forbidden
        var duel = await history.GetDetailsAsync(userId, id, cancellationToken);
        return duel is null ? Problem("Duel not found.", statusCode: StatusCodes.Status404NotFound) : duel;
    }

    private bool TryGetUserId(out Guid userId) =>
        Guid.TryParse(User.FindFirstValue(JwtRegisteredClaimNames.Sub), out userId);
}
