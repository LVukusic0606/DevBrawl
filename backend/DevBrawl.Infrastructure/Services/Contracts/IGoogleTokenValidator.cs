using DevBrawl.Auth;

namespace DevBrawl.Infrastructure.Services.Contracts;

public interface IGoogleTokenValidator
{
    bool IsConfigured { get; }
    string? ClientId { get; }

    // Null when the token isn't a valid Google ID token for this app
    Task<GoogleIdentity?> ValidateAsync(string idToken, CancellationToken cancellationToken = default);
}
