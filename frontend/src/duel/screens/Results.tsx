import { useEffect, useState, type ReactNode } from 'react'
import { getDuel } from '../../api/duels'
import { loadSession } from '../../api/session'
import { drawDuelCard } from '../../share/cards'
import { ShareButton } from '../../share/ShareButton'
import { ROUND_RESULT_LABELS, roundTypeIcon, roundTypeName } from '../rounds'
import { formatClock } from '../useCountdown'
import type { Match } from '../useDuel'
import type { DuelDetails, DuelEndedEvent, DuelResult, DuelRoundReview, RatingChange } from '../types'

const HEADLINES: Record<DuelResult, string> = {
  won: 'You won.',
  lost: 'You lost.',
  draw: "It's a draw.",
}

interface ResultsProps {
  match: Match | null
  ended: DuelEndedEvent
  categoryName: (id: number) => string
  onReview: (details: DuelDetails) => void
  onPlayAgain: () => void
  // Invites the same friend again; only offered after a friendly duel
  onRematch: (friendId: string) => void
}

export function Results({ match, ended, categoryName, onReview, onPlayAgain, onRematch }: ResultsProps) {
  const [details, setDetails] = useState<DuelDetails | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let cancelled = false
    getDuel(ended.duelId)
      .then((value) => {
        if (!cancelled) setDetails(value)
      })
      .catch(() => {
        if (!cancelled) setFailed(true)
      })
    return () => {
      cancelled = true
    }
  }, [ended.duelId])

  const rounds = details?.rounds ?? []
  const correct = details
    ? rounds.filter((round) => round.youCorrect).length
    : Object.values(match?.outcomes ?? {}).filter((outcome) => outcome.youCorrect).length
  const opponentName = details?.summary.opponent.nickname ?? match?.opponent.nickname ?? 'Opponent'
  const opponentId = details?.summary.opponent.id ?? match?.opponent.id ?? null
  const { friendly } = ended
  // A friendly duel changes no ratings, so its rows come from the rounds played, in round order
  const rows: { categoryId: number; change: RatingChange | null }[] = friendly
    ? [...new Set(rounds.map((round) => round.categoryId))].map((categoryId) => ({ categoryId, change: null }))
    : ended.ratingChanges.map((change) => ({ categoryId: change.categoryId, change }))
  const duration = details?.summary.finishedAt
    ? Math.round(
        (new Date(details.summary.finishedAt).getTime() - new Date(details.summary.startedAt).getTime()) / 1000,
      )
    : null

  return (
    <div className="duel-results">
      <section className={`duel-results-hero is-${ended.result}`} aria-labelledby="results-title">
        <p className="duel-eyebrow">{friendly ? 'Friendly duel over' : 'Duel over'}</p>
        <h1 id="results-title" className="duel-hero-title">
          {HEADLINES[ended.result]}
        </h1>
        <p className="duel-final-score" aria-label={`Score ${ended.yourScore} to ${ended.opponentScore}`}>
          <span className="duel-final-name">{match?.you.nickname ?? 'You'}</span>
          <span className="duel-final-value">
            {ended.yourScore}
            <span className="duel-final-dash">–</span>
            {ended.opponentScore}
          </span>
          <span className="duel-final-name">{opponentName}</span>
        </p>
      </section>

      <dl className="duel-stats">
        <div className="duel-stat">
          <dt>Correct answers</dt>
          <dd>{correct}/5</dd>
        </div>
        <div className="duel-stat">
          <dt>Time taken</dt>
          <dd>{duration !== null ? formatClock(duration) : '–'}</dd>
        </div>
        {friendly ? (
          <div className="duel-stat">
            <dt>No ELO or XP changes</dt>
            <dd>Friendly</dd>
          </div>
        ) : (
          <div className="duel-stat">
            <dt>XP earned</dt>
            <dd className="is-reward">+{ended.xpGained}</dd>
          </div>
        )}
      </dl>

      <section className="duel-panel" aria-labelledby="ratings-title">
        <h2 id="ratings-title" className="duel-section-title">
          {friendly ? 'Rounds by category' : 'Rating by category'}
        </h2>
        <table className="duel-table">
          <thead>
            <tr>
              <th scope="col">Category</th>
              <th scope="col">Challenge</th>
              <th scope="col">You</th>
              <th scope="col">{opponentName}</th>
              <th scope="col">Round</th>
              {!friendly && <th scope="col">Rating</th>}
              {!friendly && <th scope="col">Change</th>}
            </tr>
          </thead>
          <tbody>
            {rows.map(({ categoryId, change }) => {
              // A category can come up in more than one round; each round gets its own line in the cell
              const inCategory = rounds.filter((round) => round.categoryId === categoryId)
              return (
                <tr key={categoryId}>
                  <td>{categoryName(categoryId)}</td>
                  <td>
                    <RoundLines rounds={inCategory}>
                      {(round) => (
                        <span className="duel-table-challenge">
                          <i className={`ti ${roundTypeIcon(round.type)}`} aria-hidden="true" />
                          <span className="duel-sr-only">{roundTypeName(round.type)}:</span>
                          {round.challenge.title}
                        </span>
                      )}
                    </RoundLines>
                  </td>
                  <td>
                    <RoundLines rounds={inCategory}>{(round) => <Mark correct={round.youCorrect} />}</RoundLines>
                  </td>
                  <td>
                    <RoundLines rounds={inCategory}>{(round) => <Mark correct={round.opponentCorrect} />}</RoundLines>
                  </td>
                  <td>
                    <RoundLines rounds={inCategory}>
                      {(round) => (
                        <span className={`duel-table-outcome is-${round.result}`}>
                          {ROUND_RESULT_LABELS[round.result]}
                        </span>
                      )}
                    </RoundLines>
                  </td>
                  {change && (
                    <td className="duel-table-number">
                      {change.before} → <span className="duel-rating-after">{change.after}</span>
                    </td>
                  )}
                  {change && (
                    <td className={`duel-table-number duel-delta ${deltaTone(change.delta)}`}>
                      {change.delta > 0 ? `+${change.delta}` : change.delta}
                    </td>
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>
        {failed && (
          <p className="duel-error">
            {friendly ? "Couldn't load the rounds." : "Couldn't load the rounds. The ratings above are saved."}
          </p>
        )}
        {!failed && !details && <p className="duel-muted">Loading the rounds…</p>}
      </section>

      <div className="duel-results-actions">
        <button type="button" className="duel-secondary is-large" disabled={!details} onClick={() => details && onReview(details)}>
          <i className="ti ti-list-check" aria-hidden="true" />
          Review answers
        </button>
        <ShareButton
          label="Share result"
          fileName={`devbrawl-duel-${ended.duelId.slice(0, 8)}`}
          shareText={`${HEADLINES[ended.result]} ${ended.yourScore}–${ended.opponentScore} in a DevBrawl duel.`}
          className="duel-secondary is-large"
          render={() =>
            drawDuelCard({
              result: ended.result,
              you: { nickname: match?.you.nickname ?? loadSession()?.user.nickname ?? 'You', avatarId: match?.you.avatarId },
              opponent: { nickname: opponentName, avatarId: match?.opponent.avatarId },
              yourScore: ended.yourScore,
              opponentScore: ended.opponentScore,
              correct,
              rounds: 5,
              xpGained: ended.xpGained,
              durationSeconds: duration,
              ratingChanges: ended.ratingChanges.map((c) => ({ categoryName: categoryName(c.categoryId), delta: c.delta })),
            })
          }
        />
        {friendly && opponentId ? (
          <>
            <button type="button" className="duel-secondary is-large" onClick={onPlayAgain}>
              Back to lobby
            </button>
            <button type="button" className="duel-primary is-large" onClick={() => onRematch(opponentId)}>
              Rematch
              <i className="ti ti-swords" aria-hidden="true" />
            </button>
          </>
        ) : (
          <button type="button" className="duel-primary is-large" onClick={onPlayAgain}>
            Play again
            <i className="ti ti-swords" aria-hidden="true" />
          </button>
        )}
      </div>
    </div>
  )
}

function deltaTone(delta: number) {
  return delta > 0 ? 'is-up' : delta < 0 ? 'is-down' : 'is-flat'
}

// One line per round of the category, or a dash while the rounds are still loading
function RoundLines({ rounds, children }: { rounds: DuelRoundReview[]; children: (round: DuelRoundReview) => ReactNode }) {
  if (rounds.length === 0) return <span className="duel-muted">–</span>
  return (
    <span className="duel-table-lines">
      {rounds.map((round) => (
        <span key={round.roundNumber}>{children(round)}</span>
      ))}
    </span>
  )
}

// A check or a cross; the words "right" and "wrong" are there for screen readers
function Mark({ correct }: { correct: boolean }) {
  return (
    <span className={`duel-table-mark ${correct ? 'is-right' : 'is-wrong'}`}>
      <i className={`ti ${correct ? 'ti-check' : 'ti-x'}`} aria-hidden="true" />
      <span className="duel-sr-only">{correct ? 'right' : 'wrong'}</span>
    </span>
  )
}
