using DevBrawl.Infrastructure.Profiles;

namespace DevBrawl.Infrastructure.Services.Contracts;

public interface IProfileService
{
    // null if the user doesn't exist
    Task<ProfileResponse?> GetAsync(Guid userId, Guid requesterId, CancellationToken cancellationToken = default);
}
