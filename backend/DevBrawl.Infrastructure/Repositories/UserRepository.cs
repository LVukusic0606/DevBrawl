using DevBrawl.Auth.Domain;
using DevBrawl.Infrastructure.Data;
using DevBrawl.Infrastructure.Repositories.Contracts;
using Microsoft.EntityFrameworkCore;

namespace DevBrawl.Infrastructure.Repositories;

public class UserRepository(AppDbContext db) : IUserRepository
{
    public Task<User?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default) =>
        db.Users.FirstOrDefaultAsync(u => u.Id == id, cancellationToken);

    public Task<User?> GetByEmailAsync(string email, CancellationToken cancellationToken = default) =>
        db.Users.FirstOrDefaultAsync(u => u.Email == email, cancellationToken);

    public Task<User?> GetByGoogleSubjectAsync(string googleSubject, CancellationToken cancellationToken = default) =>
        db.Users.FirstOrDefaultAsync(u => u.GoogleSubject == googleSubject, cancellationToken);

    public Task<bool> EmailExistsAsync(string email, CancellationToken cancellationToken = default) =>
        db.Users.AnyAsync(u => u.Email == email, cancellationToken);

    public Task<bool> NicknameExistsAsync(string nickname, CancellationToken cancellationToken = default) =>
        db.Users.AnyAsync(u => u.Nickname == nickname, cancellationToken);

    public void Add(User user) => db.Users.Add(user);
}
