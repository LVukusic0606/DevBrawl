import type { DuelDetails } from '../types'

interface ReviewProps {
  details: DuelDetails
  // Leaves the duel's results and review, back to the Brawl lobby
  onLeave: () => void
}

// One tile per round. Opening a round's full review isn't built yet, so the tiles don't navigate anywhere.
export function Review({ details, onLeave }: ReviewProps) {
  return (
    <div className="duel-review">
      <h1 className="duel-hero-title">Review answers</h1>

      <ol className="duel-review-tiles">
        {details.rounds.map((round) => (
          <li key={round.roundNumber}>
            <button type="button" className="duel-review-tile">
              Round {round.roundNumber}
            </button>
          </li>
        ))}
      </ol>

      <div className="duel-results-actions">
        <button type="button" className="duel-secondary is-large" onClick={onLeave}>
          <i className="ti ti-logout" aria-hidden="true" />
          Leave duel stats
        </button>
      </div>
    </div>
  )
}
