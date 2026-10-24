using System.Text;
using DevBrawl.Auth;
using Microsoft.IdentityModel.Tokens;

namespace DevBrawl.Infrastructure;

public static class JwtOptionsExtensions
{
    public static SymmetricSecurityKey GetSigningKey(this JwtOptions options) =>
        new(Encoding.UTF8.GetBytes(options.Key));
}
