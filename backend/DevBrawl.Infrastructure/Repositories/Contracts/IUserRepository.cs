using DevBrawl.Auth.Domain;

namespace DevBrawl.Infrastructure.Repositories.Contracts;

public interface IUserRepository
{
    Task<User?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<User?> GetByEmailAsync(string email, CancellationToken cancellationToken = default);
    Task<User?> GetByGoogleSubjectAsync(string googleSubject, CancellationToken cancellationToken = default);
    Task<bool> EmailExistsAsync(string email, CancellationToken cancellationToken = default);
    Task<bool> NicknameExistsAsync(string nickname, CancellationToken cancellationToken = default);
    void Add(User user);
}
