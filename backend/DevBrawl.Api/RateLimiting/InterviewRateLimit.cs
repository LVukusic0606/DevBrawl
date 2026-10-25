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
    // Reading interviewer messages aloud; separate so voice doesn't use up the interview budget
    public const string VoicePolicyName = "interview-voice";

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
                        $"You've reached the hourly limit for the interview. Try again in {minutes} min.",
                        statusCode: StatusCodes.Status429TooManyRequests)
                    .ExecuteAsync(context.HttpContext);
            };

            // One counter per logged-in user; the interview endpoints require login, so the fallback is never shared in practice
            // A token bucket refills one request at a time, so a user who used up the budget gets requests back gradually,
            // and it reports when the next one is available (used for Retry-After)
            limiter.AddPolicy(PolicyName, http => PerUser(http, options.RequestsPerHour));
            limiter.AddPolicy(VoicePolicyName, http => PerUser(http, options.VoiceRequestsPerHour));
        });

        return services;
    }

    private static RateLimitPartition<string> PerUser(HttpContext http, int requestsPerHour) =>
        RateLimitPartition.GetTokenBucketLimiter(
            http.User.FindFirstValue(JwtRegisteredClaimNames.Sub) ?? "anonymous",
            _ => new TokenBucketRateLimiterOptions
            {
                TokenLimit = requestsPerHour,
                TokensPerPeriod = 1,
                ReplenishmentPeriod = TimeSpan.FromHours(1) / requestsPerHour,
                QueueLimit = 0
            });
}

public class InterviewRateLimitOptions
{
    public const string SectionName = "Interview:RateLimit";

    // Counts questions and answers together: 30 is about 15 question-and-answer rounds per hour.
    // Also the burst size: a user can spend all of it at once, then gets one back every 60 / RequestsPerHour minutes.
    public int RequestsPerHour { get; set; } = 30;

    // Interviewer messages read aloud; replays of the same message are cached but still count
    public int VoiceRequestsPerHour { get; set; } = 60;
}
