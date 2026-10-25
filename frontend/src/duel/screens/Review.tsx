import { useEffect, useState } from 'react'
import { ChallengeView } from '../challenges/ChallengeView'
import { ROUND_RESULT_LABELS, roundSummary, roundTypeIcon, roundTypeName } from '../rounds'
import type { ConceptQuizReveal, DuelDetails, DuelRoundReview } from '../types'

interface ReviewProps {
  details: DuelDetails
  categoryName: (id: number) => string
  // Leaves the duel's results and review, back to the Brawl lobby
  onLeave: () => void
}

// One tile per round; a tile opens that round with the player's answer, the solution and the explanation
export function Review({ details, categoryName, onLeave }: ReviewProps) {
  const [openRound, setOpenRound] = useState<number | null>(null)
  const index = details.rounds.findIndex((round) => round.roundNumber === openRound)

  if (index >= 0) {
    return (
      <RoundReview
        round={details.rounds[index]}
        opponentName={details.summary.opponent.nickname}
        categoryName={categoryName}
        previous={index > 0 ? details.rounds[index - 1].roundNumber : null}
        next={index < details.rounds.length - 1 ? details.rounds[index + 1].roundNumber : null}
        onOpen={setOpenRound}
        onClose={() => setOpenRound(null)}
      />
    )
  }

  return (
    <div className="duel-review">
      <h1 className="duel-hero-title">Review answers</h1>

      <ol className="duel-review-tiles">
        {details.rounds.map((round) => (
          <li key={round.roundNumber}>
            <button
              type="button"
              className={`duel-review-tile is-${round.result}`}
              onClick={() => setOpenRound(round.roundNumber)}
            >
              <span>Round {round.roundNumber}</span>
              <span className="duel-review-tile-type">
                <i className={`ti ${roundTypeIcon(round.type)}`} aria-hidden="true" />
                {roundTypeName(round.type)}
              </span>
              <span className="duel-review-tile-result">
                <i className={`ti ${round.youCorrect ? 'ti-check' : 'ti-x'}`} aria-hidden="true" />
                {!round.yourAnswer ? 'No answer' : round.youCorrect ? 'Correct' : 'Wrong'}
                {' · '}
                {ROUND_RESULT_LABELS[round.result]}
              </span>
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

interface RoundReviewProps {
  round: DuelRoundReview
  opponentName: string
  categoryName: (id: number) => string
  previous: number | null
  next: number | null
  onOpen: (roundNumber: number) => void
  onClose: () => void
}

function RoundReview({ round, opponentName, categoryName, previous, next, onOpen, onClose }: RoundReviewProps) {
  // Each round starts at the top, like during the duel
  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [round.roundNumber])

  const summary = roundSummary(
    round.result,
    { answered: round.yourAnswer !== null, correct: round.youCorrect },
    { answered: round.opponentAnswered, correct: round.opponentCorrect },
    opponentName,
  )
  const mistake = round.type === 'conceptQuiz' ? (round.reveal as ConceptQuizReveal).commonMistake : null

  return (
    <div className="duel-round">
      <nav className="duel-review-nav" aria-label="Rounds">
        <button type="button" className="duel-secondary" onClick={onClose}>
          <i className="ti ti-layout-grid" aria-hidden="true" />
          All rounds
        </button>
        <div className="duel-review-nav-steps">
          <button
            type="button"
            className="duel-secondary"
            disabled={previous === null}
            onClick={() => previous !== null && onOpen(previous)}
          >
            <i className="ti ti-arrow-left" aria-hidden="true" />
            Previous
          </button>
          <button
            type="button"
            className="duel-secondary"
            disabled={next === null}
            onClick={() => next !== null && onOpen(next)}
          >
            Next
            <i className="ti ti-arrow-right" aria-hidden="true" />
          </button>
        </div>
      </nav>

      <div className="duel-round-main">
        <header className="duel-round-header">
          <div className="duel-round-heading">
            <p className="duel-eyebrow">
              Round {round.roundNumber} · {roundTypeName(round.type)} · {categoryName(round.categoryId)}
            </p>
            <h1 className="duel-prompt">{round.challenge.prompt}</h1>
          </div>
        </header>

        <section className={`duel-reveal is-${round.result}`} aria-label="Round result">
          <h2 className="duel-reveal-title">{ROUND_RESULT_LABELS[round.result]}</h2>
          <p className="duel-reveal-note">
            {round.yourAnswer === null ? "You didn't answer in time. " : ''}
            {summary}
          </p>
        </section>

        <section className="duel-explanation" aria-labelledby="explanation-title">
          <h2 id="explanation-title" className="duel-explanation-title">
            <i className="ti ti-bulb" aria-hidden="true" />
            Why
          </h2>
          <p>{round.reveal.explanation}</p>
          {mistake && (
            <p className="duel-explanation-mistake">
              <strong>Common mistake ({mistake.optionId.toUpperCase()}):</strong> {mistake.explanation}
            </p>
          )}
        </section>

        <ChallengeView
          key={round.roundNumber}
          challenge={round.challenge}
          reveal={round.reveal}
          answer={round.yourAnswer}
          locked
        />
      </div>
    </div>
  )
}
