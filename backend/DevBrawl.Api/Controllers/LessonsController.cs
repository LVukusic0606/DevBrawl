using System.Security.Claims;
using DevBrawl.Common.Domain;
using DevBrawl.Infrastructure.Services.Contracts;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.IdentityModel.JsonWebTokens;

namespace DevBrawl.Api.Controllers;

// The logged-in player's lesson progress. Other players' progress is part of their profile.
[ApiController]
[Authorize]
[Route("api/[controller]")]
public class LessonsController(ILessonProgressService progress) : ControllerBase
{
    [HttpGet("completed")]
    [ProducesResponseType<IReadOnlyList<string>>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<IReadOnlyList<string>>> GetCompleted(CancellationToken cancellationToken)
    {
        if (!TryGetUserId(out var userId))
            return Unauthorized();
        return Ok(await progress.GetCompletedAsync(userId, cancellationToken));
    }

    // Idempotent: completing a lesson again is a no-op
    [HttpPut("{lessonId}/completed")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> Complete(string lessonId, CancellationToken cancellationToken)
    {
        if (!TryGetUserId(out var userId))
            return Unauthorized();
        if (!LessonCompletion.IsValidLessonId(lessonId))
            return Problem("Unknown lesson.", statusCode: StatusCodes.Status400BadRequest);

        await progress.CompleteAsync(userId, lessonId, cancellationToken);
        return NoContent();
    }

    private bool TryGetUserId(out Guid userId) =>
        Guid.TryParse(User.FindFirstValue(JwtRegisteredClaimNames.Sub), out userId);
}
