using DevBrawl.Infrastructure.Services;
using DevBrawl.Infrastructure.Services.Contracts;
using DevBrawl.Interview;
using DevBrawl.Interview.Gemini;
using DevBrawl.Interview.Knowledge;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;

namespace DevBrawl.Infrastructure;

public static class InterviewRegistration
{
    public static IServiceCollection AddInterview(this IServiceCollection services, IConfiguration configuration)
    {
        services.Configure<InterviewOptions>(configuration.GetSection(InterviewOptions.SectionName));

        services.AddSingleton(sp =>
        {
            var path = sp.GetRequiredService<IOptions<InterviewOptions>>().Value.KnowledgePath
                ?? Path.Combine(AppContext.BaseDirectory, "Knowledge", "learn-content.json");
            return LearnKnowledgeBase.Load(path);
        });

        // Gemini:ApiKey (user secrets) or GEMINI_API_KEY. Without a key the interview endpoints answer 503.
        var gemini = configuration.GetSection(GeminiOptions.SectionName);
        services.Configure<GeminiOptions>(gemini);
        var geminiOptions = gemini.Get<GeminiOptions>() ?? new GeminiOptions();
        services.AddHttpClient<IInterviewer, GeminiInterviewer>(http =>
        {
            http.BaseAddress = new Uri(geminiOptions.BaseUrl);
            http.Timeout = TimeSpan.FromSeconds(geminiOptions.TimeoutSeconds);
        });

        services.AddMemoryCache();
        services.AddScoped<IInterviewService, InterviewService>();
        return services;
    }
}
