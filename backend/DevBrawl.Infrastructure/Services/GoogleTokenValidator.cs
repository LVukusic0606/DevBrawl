using DevBrawl.Auth;
using DevBrawl.Infrastructure.Services.Contracts;
using Google.Apis.Auth;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace DevBrawl.Infrastructure.Services;

// Checks Google ID tokens with Google's library: signature against Google's public keys, issuer, expiry,
// and that the token was issued for our client ID (so tokens from other apps are rejected)
public class GoogleTokenValidator(IOptions<GoogleOptions> options, ILogger<GoogleTokenValidator> logger) : IGoogleTokenValidator
{
    public string? ClientId => string.IsNullOrWhiteSpace(options.Value.ClientId) ? null : options.Value.ClientId.Trim();

    public bool IsConfigured => ClientId is not null;

    public async Task<GoogleIdentity?> ValidateAsync(string idToken, CancellationToken cancellationToken = default)
    {
        if (ClientId is null) return null;

        try
        {
            var payload = await GoogleJsonWebSignature.ValidateAsync(idToken,
                new GoogleJsonWebSignature.ValidationSettings { Audience = [ClientId] });
            if (string.IsNullOrWhiteSpace(payload.Subject) || string.IsNullOrWhiteSpace(payload.Email))
                return null;
            return new GoogleIdentity(payload.Subject, payload.Email, payload.EmailVerified, payload.Name);
        }
        catch (InvalidJwtException e)
        {
            logger.LogWarning("Rejected a Google ID token: {Reason}", e.Message);
            return null;
        }
    }
}
