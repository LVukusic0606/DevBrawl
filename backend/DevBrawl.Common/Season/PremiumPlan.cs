namespace DevBrawl.Common.Season;

// Premium is a monthly subscription. For the hackathon there is no payment provider:
// activating it in the app is a demo checkout that grants one period.
public static class PremiumPlan
{
    public const decimal MonthlyPriceEur = 4.99m;
    public static readonly TimeSpan Period = TimeSpan.FromDays(30);

    // AI interviews a player can start per calendar month (UTC)
    public const int FreeInterviewsPerMonth = 3;
    public const int PremiumInterviewsPerMonth = 30;
}
