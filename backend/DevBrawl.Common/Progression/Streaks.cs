namespace DevBrawl.Common.Progression;

// Current: consecutive days with a newly completed lesson, ending today or yesterday (today isn't over yet, so a streak
// that reached yesterday is still alive). Best: the longest run ever.
public sealed record Streak(int Current, int Best, bool ActiveToday);

public static class Streaks
{
    public static Streak From(IEnumerable<DateOnly> days, DateOnly today)
    {
        var sorted = days.Distinct().Order().ToList();
        if (sorted.Count == 0)
            return new Streak(0, 0, false);

        var best = 1;
        var run = 1;
        for (var i = 1; i < sorted.Count; i++)
        {
            run = sorted[i] == sorted[i - 1].AddDays(1) ? run + 1 : 1;
            best = Math.Max(best, run);
        }

        // run now holds the length of the run that ends on the last active day
        var last = sorted[^1];
        var current = last == today || last == today.AddDays(-1) ? run : 0;
        return new Streak(current, best, last == today);
    }

    public static DateOnly Today() => DateOnly.FromDateTime(DateTime.UtcNow);
}
