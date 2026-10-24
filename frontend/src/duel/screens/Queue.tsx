import { formatClock, useElapsed } from '../useCountdown'

export function Queue({ since, onCancel }: { since: number; onCancel: () => void }) {
  const elapsed = useElapsed(since)

  return (
    <section className="duel-center" aria-live="polite">
      <p className="duel-eyebrow">Matchmaking</p>
      <h1 className="duel-hero-title">Looking for an opponent.</h1>
      <p className="duel-big-number" aria-label={`Waiting for ${elapsed} seconds`}>
        {formatClock(elapsed)}
      </p>
      <p className="duel-lead">The first player who joins the queue is your match.</p>
      <button type="button" className="duel-secondary" onClick={onCancel}>
        <i className="ti ti-x" aria-hidden="true" />
        Cancel
      </button>
    </section>
  )
}
