import { useEffect } from 'react'
import { ChallengeView } from '../challenges/ChallengeView'
import { StatusTag } from '../challenges/shared'
import { ROUND_RESULT_LABELS, TOTAL_ROUNDS, roundSummary } from '../rounds'
import { formatClock, useCountdown } from '../useCountdown'
import type { Match, RoundState } from '../useDuel'
import type { Answer, RoundEndedEvent } from '../types'

interface RoundScreenProps {
  match: Match
  current: RoundState | null
  // Set during the reveal
  ended: RoundEndedEvent | null
  onSubmit: (answer: Answer) => void
}

export function RoundScreen({ match, current, ended, onSubmit }: RoundScreenProps) {
  const round = current?.round ?? null
  const roundNumber = ended?.roundNumber ?? round?.roundNumber ?? 1
  const locked = Boolean(ended) || Boolean(current?.youAnswered) || Boolean(current?.submitting)
  const revealed = Boolean(ended)

  // A new round and its result both start at the top, where the scoreboard and the outcome are
  useEffect(() => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' })
  }, [roundNumber, revealed])

  return (
    <div className="duel-round">
      <Scoreboard match={match} roundNumber={roundNumber} />

      {!match.opponentConnected && (
        <p className="duel-notice" role="status">
          <i className="ti ti-plug-connected-x" aria-hidden="true" />
          {match.opponent.nickname} lost the connection. The clock keeps running.
        </p>
      )}

      <div className="duel-round-main">
        {round && (
          <header className="duel-round-header">
            <div className="duel-round-heading">
              <h1 className="duel-prompt">{round.challenge.prompt}</h1>
            </div>
            {!ended && <RoundTimer endsAt={round.endsAt} limitSeconds={round.timeLimitSeconds} />}
          </header>
        )}

        {!ended && current && (
          <div className="duel-round-status" aria-live="polite">
            {current.youAnswered && (
              <StatusTag tone="picked">Answer locked. Waiting for the round to end.</StatusTag>
            )}
            {current.opponentAnswered && (
              <StatusTag tone="warning">{match.opponent.nickname} answered</StatusTag>
            )}
            {current.error && <p className="duel-error">{current.error}</p>}
          </div>
        )}

        {ended && <RevealPanel ended={ended} match={match} />}

        {round && current && (
          <ChallengeView
            // Remount at the reveal so each view starts from the locked answer and the solution
            key={`${match.duelId}-${round.roundNumber}-${ended ? 'reveal' : 'play'}`}
            challenge={round.challenge}
            reveal={ended?.reveal ?? null}
            answer={current.answer}
            locked={locked}
            submitting={current.submitting}
            onSubmit={onSubmit}
          />
        )}
      </div>
    </div>
  )
}

function Scoreboard({ match, roundNumber }: { match: Match; roundNumber: number }) {
  return (
    <div className="duel-scoreboard">
      <div className="duel-score is-you">
        <span className="duel-score-name">{match.you.nickname}</span>
        <span className="duel-score-value">{match.yourScore}</span>
      </div>

      <ol className="duel-pips" aria-label={`Round ${roundNumber} of ${TOTAL_ROUNDS}`}>
        {Array.from({ length: TOTAL_ROUNDS }, (_, index) => {
          const number = index + 1
          const outcome = match.outcomes[number]
          const state = outcome ? `is-${outcome.result}` : number === roundNumber ? 'is-current' : ''
          return (
            <li key={number} className={`duel-pip ${state}`}>
              <span className="duel-sr-only">
                Round {number}: {outcome ? ROUND_RESULT_LABELS[outcome.result] : number === roundNumber ? 'now' : 'not played'}
              </span>
            </li>
          )
        })}
      </ol>

      <div className="duel-score is-opponent">
        <span className="duel-score-value">{match.opponentScore}</span>
        <span className="duel-score-name">{match.opponent.nickname}</span>
      </div>
    </div>
  )
}

// Counts down to the server's endsAt, so both players see the same clock
function RoundTimer({ endsAt, limitSeconds }: { endsAt: string; limitSeconds: number }) {
  const left = useCountdown(endsAt) ?? 0
  const seconds = Math.ceil(left / 1000)
  const fraction = Math.min(1, left / (limitSeconds * 1000))
  const tone = fraction > 0.5 ? 'is-calm' : fraction > 0.2 ? 'is-soon' : 'is-urgent'

  return (
    <div className={`duel-timer ${tone}`} role="timer" aria-label={`${seconds} seconds left`}>
      <span className="duel-timer-value">{formatClock(seconds)}</span>
    </div>
  )
}

function RevealPanel({ ended, match }: { ended: RoundEndedEvent; match: Match }) {
  const summary = roundSummary(
    ended.result,
    { answered: ended.youAnswered, correct: ended.youCorrect },
    { answered: ended.opponentAnswered, correct: ended.opponentCorrect },
    match.opponent.nickname,
  )

  // The full explanation lives in "Review answers"; here only the outcome and why
  return (
    <section className={`duel-reveal is-${ended.result}`} aria-live="polite" aria-label="Round result">
      <h2 className="duel-reveal-title">{ROUND_RESULT_LABELS[ended.result]}</h2>
      <p className="duel-reveal-note">{summary}</p>
    </section>
  )
}
