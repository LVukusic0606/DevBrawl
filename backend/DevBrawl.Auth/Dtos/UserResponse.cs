using DevBrawl.Auth.Domain;

namespace DevBrawl.Auth.Dtos;

public sealed record UserResponse(Guid Id, string Nickname, string Email)
{
    public static UserResponse From(User user) =>
        new(user.Id, user.Nickname, user.Email);
}
