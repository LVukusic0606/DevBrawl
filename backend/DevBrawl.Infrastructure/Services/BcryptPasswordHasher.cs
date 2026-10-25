using DevBrawl.Infrastructure.Services.Contracts;

namespace DevBrawl.Infrastructure.Services;

public class BcryptPasswordHasher : IPasswordHasher
{
    private const int WorkFactor = 12;

    public string Hash(string password) => BCrypt.Net.BCrypt.HashPassword(password, WorkFactor);

    // Accounts that only use Google have no hash; no password matches them (and bcrypt would throw on an empty hash)
    public bool Verify(string password, string passwordHash) =>
        !string.IsNullOrEmpty(passwordHash) && BCrypt.Net.BCrypt.Verify(password, passwordHash);
}
