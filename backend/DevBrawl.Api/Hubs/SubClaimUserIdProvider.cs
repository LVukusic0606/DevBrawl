using Microsoft.AspNetCore.SignalR;
using Microsoft.IdentityModel.JsonWebTokens;

namespace DevBrawl.Api.Hubs;

// Inbound claims aren't mapped (MapInboundClaims = false), so the user id is the raw "sub" claim,
// which the default provider (ClaimTypes.NameIdentifier) wouldn't find
public sealed class SubClaimUserIdProvider : IUserIdProvider
{
    public string? GetUserId(HubConnectionContext connection) =>
        connection.User?.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;
}
