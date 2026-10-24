using System.Security.Claims;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.IdentityModel.JsonWebTokens;

namespace DevBrawl.Api.RateLimiting;

// Every interview question and every grade is a Gemini call, so each user gets a budget per hour.
// Counters live in memory: they reset when the API restarts and aren't shared between instances.
public static class InterviewRateLimit
{
    public const string PolicyName = "interview";

    public static IServiceCollection AddInterviewRateLimit(this IServiceCollection services, IConfiguration configuration)
    {
        var options = configuration.GetSection(InterviewRateLimitOptions.SectionName).Get<InterviewRateLimitOptions>()
            ?? new InterviewRateLimitOptions();

        services.AddRateLimiter(limiter =>
        {
            limiter.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
            limiter.OnRejected = async (context, cancellationToken) =>
            {
                var minutes = 1;
                if (context.Lease.TryGetMetadata(MetadataName.RetryAfter, out var retryAfter))
                {
                    context.HttpContext.Response.Headers.RetryAfter = ((int)Math.Ceiling(retryAfter.TotalSeconds)).ToString();
                    minutes = Math.Max(1, (int)Math.Ceiling(retryAfter.TotalMinutes));
                }
                await Results.Problem(
                        $"You've reached the limit of {options.RequestsPerHour} interview requests per hour. Try again in {minutes} min.",
                        statusCode: StatusCodes.Status429TooManyRequests)
                    .ExecuteAsync(context.HttpContext);
            };

            // One counter per logged-in user; the interview endpoints require login, so the fallback is never shared in practice
            // A token bucket refills one request at a time, so a user who used up the budget gets requests back gradually,
            // and it reports when the next one is available (used for Retry-After)
            limiter.AddPolicy(PolicyName, http => RateLimitPartition.GetTokenBucketLimiter(
                http.User.FindFirstValue(JwtRegisteredClaimNames.Sub) ?? "anonymous",
                _ => new TokenBucketRateLimiterOptions
                {
                    TokenLimit = options.RequestsPerHour,
                    TokensPerPeriod = 1,
                    ReplenishmentPeriod = TimeSpan.FromHours(1) / options.RequestsPerHour,
                    QueueLimit = 0
                }));
        });

        return services;
    }
}

public class InterviewRateLimitOptions
{
    public const string SectionName = "Interview:RateLimit";

    // Counts questions and answers together: 30 is about 15 question-and-answer rounds per hour.
    // Also the burst size: a user can spend all of it at once, then gets one back every 60 / RequestsPerHour minutes.
    public int RequestsPerHour { get; set; } = 30;
}
