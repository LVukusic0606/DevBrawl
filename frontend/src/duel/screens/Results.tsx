import { useEffect, useState } from 'react'
import { getDuel } from '../../api/duels'
import { StatusTag } from '../challenges/shared'
import { roundTypeName } from '../rounds'
import { formatClock } from '../useCountdown'
import type { Match } from '../useDuel'
import type { DuelDetails, DuelEndedEvent, DuelResult, DuelRoundReview } from '../types'

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
}

export function Results({ match, ended, categoryName, onReview, onPlayAgain }: ResultsProps) {
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
  const duration = details?.summary.finishedAt
    ? Math.round(
        (new Date(details.summary.finishedAt).getTime() - new Date(details.summary.startedAt).getTime()) / 1000,
      )
    : null

  return (
    <div className="duel-results">
      <section className={`duel-results-hero is-${ended.result}`} aria-labelledby="results-title">
        <p className="duel-eyebrow">Duel over</p>
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
        <div className="duel-stat">
          <dt>XP earned</dt>
          <dd>+{ended.xpGained}</dd>
        </div>
        <div className="duel-stat">
          <dt>Level</dt>
          <dd>
            {ended.level}
            <span className="duel-stat-sub">{ended.totalXp} XP total</span>
          </dd>
        </div>
      </dl>

      <section className="duel-panel" aria-labelledby="ratings-title">
        <h2 id="ratings-title" className="duel-section-title">
          Rating by category
        </h2>
        <p className="duel-muted">
          Every category keeps its own rating, so one duel can raise one and lower another.
        </p>
        <table className="duel-table">
          <thead>
            <tr>
              <th scope="col">Category</th>
              <th scope="col">Your rounds</th>
              <th scope="col">Rating</th>
              <th scope="col">Change</th>
            </tr>
          </thead>
          <tbody>
            {ended.ratingChanges.map((change) => (
              <tr key={change.categoryId}>
                <td>{categoryName(change.categoryId)}</td>
                <td>{categoryRecord(rounds, change.categoryId)}</td>
                <td className="duel-table-number">
                  {change.before} → {change.after}
                </td>
                <td className={`duel-table-number duel-delta ${deltaTone(change.delta)}`}>
                  {change.delta > 0 ? `+${change.delta}` : change.delta}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="duel-panel" aria-labelledby="rounds-title">
        <h2 id="rounds-title" className="duel-section-title">
          Challenges
        </h2>
        {failed && <p className="duel-error">Couldn't load the rounds. The result above is saved.</p>}
        {!failed && !details && <p className="duel-muted">Loading the rounds…</p>}
        {details && (
          <ol className="duel-round-results">
            {rounds.map((round) => (
              <li key={round.roundNumber} className="duel-round-result">
                <span className="duel-round-number">{round.roundNumber}</span>
                <span className="duel-round-result-main">
                  <span className="duel-round-result-title">{round.challenge.title}</span>
                  <span className="duel-muted">
                    {roundTypeName(round.type)} · {categoryName(round.categoryId)}
                  </span>
                </span>
                <span className="duel-round-result-tags">
                  <StatusTag tone={round.youCorrect ? 'correct' : 'wrong'}>
                    You {round.youCorrect ? 'right' : 'wrong'}
                  </StatusTag>
                  <StatusTag tone={round.opponentCorrect ? 'correct' : 'wrong'}>
                    {opponentName} {round.opponentCorrect ? 'right' : 'wrong'}
                  </StatusTag>
                </span>
              </li>
            ))}
          </ol>
        )}
      </section>

      <div className="duel-results-actions">
        <button type="button" className="duel-secondary is-large" disabled={!details} onClick={() => details && onReview(details)}>
          <i className="ti ti-list-check" aria-hidden="true" />
          Review answers
        </button>
        <button type="button" className="duel-primary is-large" onClick={onPlayAgain}>
          Play again
          <i className="ti ti-swords" aria-hidden="true" />
        </button>
      </div>
    </div>
  )
}

// How the player did in one category, e.g. "1 won, 1 lost"
function categoryRecord(rounds: DuelRoundReview[], categoryId: number) {
  const inCategory = rounds.filter((round) => round.categoryId === categoryId)
  if (inCategory.length === 0) return '–'
  const won = inCategory.filter((round) => round.result === 'won').length
  const lost = inCategory.filter((round) => round.result === 'lost').length
  const even = inCategory.length - won - lost
  return [won && `${won} won`, lost && `${lost} lost`, even && `${even} even`].filter(Boolean).join(', ')
}

function deltaTone(delta: number) {
  return delta > 0 ? 'is-up' : delta < 0 ? 'is-down' : 'is-flat'
}
