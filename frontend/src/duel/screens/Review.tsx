import { useState } from 'react'
import { ChallengeView } from '../challenges/ChallengeView'
import { StatusTag } from '../challenges/shared'
import { ROUND_RESULT_LABELS, roundSpeedNote, roundTypeName } from '../rounds'
import type { DuelDetails } from '../types'

interface ReviewProps {
  details: DuelDetails
  categoryName: (id: number) => string
  onBack: () => void
}

export function Review({ details, categoryName, onBack }: ReviewProps) {
  const missed = details.rounds.filter((round) => !round.youCorrect)
  const [onlyMissed, setOnlyMissed] = useState(missed.length > 0)
  const rounds = onlyMissed ? missed : details.rounds

  return (
    <div className="duel-review">
      <header className="duel-review-header">
        <div>
          <p className="duel-eyebrow">vs {details.summary.opponent.nickname}</p>
          <h1 className="duel-hero-title">Review answers</h1>
        </div>
        <div className="duel-review-controls" role="group" aria-label="Which rounds to show">
          <button
            type="button"
            className={`duel-secondary${onlyMissed ? ' is-active' : ''}`}
            aria-pressed={onlyMissed}
            onClick={() => setOnlyMissed(true)}
          >
            Missed ({missed.length})
          </button>
          <button
            type="button"
            className={`duel-secondary${!onlyMissed ? ' is-active' : ''}`}
            aria-pressed={!onlyMissed}
            onClick={() => setOnlyMissed(false)}
          >
            All rounds ({details.rounds.length})
          </button>
        </div>
      </header>

      {rounds.length === 0 && (
        <p className="duel-muted">
          <i className="ti ti-trophy" aria-hidden="true" /> You got every round right. Nothing to review.
        </p>
      )}

      {rounds.map((round) => (
        <article key={round.roundNumber} className="duel-review-round" aria-labelledby={`review-${round.roundNumber}`}>
          <header className="duel-review-round-header">
            <p className="duel-eyebrow">
              Round {round.roundNumber} · {roundTypeName(round.type)}
            </p>
            <span className="duel-category">{categoryName(round.categoryId)}</span>
            <StatusTag tone={round.youCorrect ? 'correct' : 'wrong'}>
              {round.youCorrect ? 'You were right' : round.yourAnswer ? 'You were wrong' : 'No answer in time'}
            </StatusTag>
            <span className="duel-muted">
              {ROUND_RESULT_LABELS[round.result]}
              {roundSpeedNote(round.result, round.youCorrect, round.opponentCorrect, details.summary.opponent.nickname)
                ? ` · ${roundSpeedNote(round.result, round.youCorrect, round.opponentCorrect, details.summary.opponent.nickname)}`
                : ''}
            </span>
          </header>
          <h2 id={`review-${round.roundNumber}`} className="duel-round-title">
            {round.challenge.title}
          </h2>
          <p className="duel-prompt">{round.challenge.prompt}</p>
          <ChallengeView challenge={round.challenge} reveal={round.reveal} answer={round.yourAnswer} locked />
          <section className="duel-explanation" aria-label="Explanation">
            <p className="duel-panel-label">
              <i className="ti ti-bulb" aria-hidden="true" />
              Why
            </p>
            <p>{round.reveal.explanation}</p>
          </section>
        </article>
      ))}

      <div className="duel-results-actions">
        <button type="button" className="duel-secondary is-large" onClick={onBack}>
          <i className="ti ti-arrow-left" aria-hidden="true" />
          Back to results
        </button>
      </div>
    </div>
  )
}
