using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace DevBrawl.Duel.Engine;

// Drives every duel's clock: starts rounds, times them out and moves on after the reveal
public sealed class DuelTicker(DuelEngine engine, IDuelStore store, ILogger<DuelTicker> logger) : BackgroundService
{
    private static readonly TimeSpan Interval = TimeSpan.FromMilliseconds(250);

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        try
        {
            await store.AbandonInProgressAsync(stoppingToken);
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            logger.LogError(ex, "Couldn't abandon duels left over from the last run");
        }

        using var timer = new PeriodicTimer(Interval);
        while (await timer.WaitForNextTickAsync(stoppingToken))
        {
            try
            {
                await engine.TickAsync();
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Duel tick failed");
            }
        }
    }
}
