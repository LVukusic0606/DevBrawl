using System.Security.Claims;
using DevBrawl.Duel.Engine;
using DevBrawl.Infrastructure.Friends;
using DevBrawl.Infrastructure.Services.Contracts;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.IdentityModel.JsonWebTokens;

namespace DevBrawl.Api.Controllers;

// Friends and friend requests. Every change returns the updated lists.
// Friendly duels are offered and accepted over the SignalR hub (InviteFriend, AcceptInvite).
[ApiController]
[Authorize]
[Route("api/[controller]")]
public class FriendsController(IFriendService friends, DuelEngine engine) : ControllerBase
{
    [HttpGet]
    [ProducesResponseType<FriendsResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<FriendsResponse>> Get(CancellationToken cancellationToken)
    {
        if (!TryGetUserId(out var userId))
            return Unauthorized();
        return await friends.GetAsync(userId, cancellationToken);
    }

    [HttpPost("requests")]
    [ProducesResponseType<FriendsResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<FriendsResponse>> SendRequest(SendFriendRequestBody body, CancellationToken cancellationToken)
    {
        if (!TryGetUserId(out var userId))
            return Unauthorized();
        return await Respond(userId, await friends.SendRequestAsync(userId, body.Nickname, cancellationToken), cancellationToken);
    }

    [HttpPost("requests/{id:guid}/accept")]
    [ProducesResponseType<FriendsResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<FriendsResponse>> AcceptRequest(Guid id, CancellationToken cancellationToken)
    {
        if (!TryGetUserId(out var userId))
            return Unauthorized();
        return await Respond(userId, await friends.AcceptRequestAsync(userId, id, cancellationToken), cancellationToken);
    }

    // Declines a request you received or withdraws one you sent
    [HttpDelete("requests/{id:guid}")]
    [ProducesResponseType<FriendsResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<FriendsResponse>> DeleteRequest(Guid id, CancellationToken cancellationToken)
    {
        if (!TryGetUserId(out var userId))
            return Unauthorized();
        return await Respond(userId, await friends.DeleteRequestAsync(userId, id, cancellationToken), cancellationToken);
    }

    [HttpDelete("{friendId:guid}")]
    [ProducesResponseType<FriendsResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<FriendsResponse>> Remove(Guid friendId, CancellationToken cancellationToken)
    {
        if (!TryGetUserId(out var userId))
            return Unauthorized();

        var error = await friends.RemoveFriendAsync(userId, friendId, cancellationToken);
        // A pending duel invite between them must not be accepted after the friendship ends
        if (error is null)
            await engine.CloseInvitesBetweenAsync(userId, friendId);
        return await Respond(userId, error, cancellationToken);
    }

    private async Task<ActionResult<FriendsResponse>> Respond(Guid userId, FriendError? error, CancellationToken cancellationToken) =>
        error switch
        {
            null => await friends.GetAsync(userId, cancellationToken),
            FriendError.PlayerNotFound => Problem("No player has that nickname.", statusCode: StatusCodes.Status404NotFound),
            FriendError.Yourself => Problem("You can't add yourself as a friend.", statusCode: StatusCodes.Status400BadRequest),
            FriendError.AlreadyFriends => Problem("You're already friends.", statusCode: StatusCodes.Status409Conflict),
            FriendError.AlreadyRequested => Problem("You already sent this player a request.", statusCode: StatusCodes.Status409Conflict),
            FriendError.RequestNotFound => Problem("This request is no longer available.", statusCode: StatusCodes.Status404NotFound),
            FriendError.NotFriends => Problem("This player isn't on your friends list.", statusCode: StatusCodes.Status404NotFound),
            _ => throw new ArgumentOutOfRangeException(nameof(error), error, null)
        };

    private bool TryGetUserId(out Guid userId) =>
        Guid.TryParse(User.FindFirstValue(JwtRegisteredClaimNames.Sub), out userId);
}
