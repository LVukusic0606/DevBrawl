using DevBrawl.Auth.Domain;

namespace DevBrawl.Auth.Dtos;

// AvatarId is one of the preset profile pictures; null when the player hasn't picked one
public sealed record UserResponse(Guid Id, string Nickname, string Email, int? AvatarId)
{
    public static UserResponse From(User user) =>
        new(user.Id, user.Nickname, user.Email, user.AvatarId);
}
