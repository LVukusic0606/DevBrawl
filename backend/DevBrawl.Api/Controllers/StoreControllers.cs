using System.Security.Claims;
using DevBrawl.Common.Domain;
using DevBrawl.Infrastructure.Data;
using DevBrawl.Infrastructure.Services.Contracts;
using DevBrawl.Infrastructure.Store;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.IdentityModel.JsonWebTokens;

namespace DevBrawl.Api.Controllers;

// Monthly season pass: progress and rewards
[ApiController]
[Authorize]
[Route("api/[controller]")]
public class SeasonController(ISeasonService seasons) : ControllerBase
{
    [HttpGet]
    [ProducesResponseType<SeasonResponse>(StatusCodes.Status200OK)]
    public async Task<ActionResult<SeasonResponse>> Get(CancellationToken cancellationToken) =>
        TryGetUserId(User, out var userId) ? await seasons.GetAsync(userId, cancellationToken) : Unauthorized();

    // Avatars and tags the player may pick: starter items plus unlocked rewards
    [HttpGet("owned")]
    [ProducesResponseType<OwnedCosmeticsResponse>(StatusCodes.Status200OK)]
    public async Task<ActionResult<OwnedCosmeticsResponse>> GetOwned(CancellationToken cancellationToken) =>
        TryGetUserId(User, out var userId) ? await seasons.GetOwnedAsync(userId, cancellationToken) : Unauthorized();

    internal static bool TryGetUserId(ClaimsPrincipal user, out Guid userId) =>
        Guid.TryParse(user.FindFirstValue(JwtRegisteredClaimNames.Sub), out userId);
}

[ApiController]
[Authorize]
[Route("api/[controller]")]
public class PremiumController(IPremiumService premium) : ControllerBase
{
    [HttpGet]
    [ProducesResponseType<PremiumResponse>(StatusCodes.Status200OK)]
    public async Task<ActionResult<PremiumResponse>> Get(CancellationToken cancellationToken) =>
        SeasonController.TryGetUserId(User, out var userId) ? await premium.GetAsync(userId, cancellationToken) : Unauthorized();

    // Demo checkout: grants one month of Premium without a payment (hackathon). Calling it again extends it.
    [HttpPost("activate")]
    [ProducesResponseType<PremiumResponse>(StatusCodes.Status200OK)]
    public async Task<ActionResult<PremiumResponse>> Activate(CancellationToken cancellationToken) =>
        SeasonController.TryGetUserId(User, out var userId) ? await premium.ActivateAsync(userId, cancellationToken) : Unauthorized();
}

// "Contact us" for schools and universities. Open without logging in, so it can be linked from outside the app.
[ApiController]
[AllowAnonymous]
[Route("api/[controller]")]
public class ContactController(AppDbContext db) : ControllerBase
{
    [HttpPost]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Submit(ContactRequestBody body, CancellationToken cancellationToken)
    {
        db.ContactRequests.Add(new ContactRequest
        {
            Id = Guid.CreateVersion7(),
            Name = body.Name.Trim(),
            Institution = body.Institution.Trim(),
            Email = body.Email.Trim(),
            Message = body.Message.Trim(),
            UserId = SeasonController.TryGetUserId(User, out var userId) ? userId : null,
            CreatedAt = DateTime.UtcNow
        });
        await db.SaveChangesAsync(cancellationToken);
        return NoContent();
    }
}
