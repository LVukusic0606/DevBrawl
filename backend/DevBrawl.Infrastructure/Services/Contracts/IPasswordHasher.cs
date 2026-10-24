namespace DevBrawl.Infrastructure.Services.Contracts;

public interface IPasswordHasher
{
    string Hash(string password);
    bool Verify(string password, string passwordHash);
}
