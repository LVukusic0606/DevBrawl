using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using DevBrawl.Auth;
using DevBrawl.Auth.Domain;
using DevBrawl.Infrastructure.Services.Contracts;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.JsonWebTokens;
using Microsoft.IdentityModel.Tokens;

namespace DevBrawl.Infrastructure.Services;

public class TokenService(IOptions<JwtOptions> options) : ITokenService
{
    private readonly JwtOptions _jwt = options.Value;
    private readonly JsonWebTokenHandler _handler = new();

    public AccessToken CreateAccessToken(User user)
    {
        var expiresAt = DateTime.UtcNow.AddMinutes(_jwt.AccessTokenMinutes);
        var descriptor = new SecurityTokenDescriptor
        {
            Issuer = _jwt.Issuer,
            Audience = _jwt.Audience,
            Expires = expiresAt,
            Subject = new ClaimsIdentity(
            [
                new Claim(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
                new Claim(JwtRegisteredClaimNames.Email, user.Email),
                new Claim("nickname", user.Nickname),
                new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
            ]),
            SigningCredentials = new SigningCredentials(_jwt.GetSigningKey(), SecurityAlgorithms.HmacSha256)
        };

        return new AccessToken(_handler.CreateToken(descriptor), expiresAt);
    }

    public NewRefreshToken CreateRefreshToken()
    {
        var token = Base64UrlEncoder.Encode(RandomNumberGenerator.GetBytes(64));
        return new NewRefreshToken(token, HashRefreshToken(token), DateTime.UtcNow.AddDays(_jwt.RefreshTokenDays));
    }

    public string HashRefreshToken(string token) =>
        Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(token)));
}
