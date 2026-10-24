import { useEffect } from 'react'
import { ChallengeView } from '../challenges/ChallengeView'
import { StatusTag } from '../challenges/shared'
import { ROUND_RESULT_LABELS, TOTAL_ROUNDS, roundSpeedNote, roundTypeName } from '../rounds'
import { formatClock, useCountdown } from '../useCountdown'
import type { Match, RoundState } from '../useDuel'
import type { Answer, RoundEndedEvent } from '../types'

interface RoundScreenProps {
  match: Match
  current: RoundState | null
  // Set during the reveal
  ended: RoundEndedEvent | null
  nextRoundAt: string | null
  categoryName: (id: number) => string
  onSubmit: (answer: Answer) => void
}

export function RoundScreen({ match, current, ended, nextRoundAt, categoryName, onSubmit }: RoundScreenProps) {
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

      {round && (
        <header className="duel-round-header">
          <div className="duel-round-heading">
            <p className="duel-eyebrow">
              Round {round.roundNumber} of {TOTAL_ROUNDS} · {roundTypeName(round.type)}
            </p>
            <span className="duel-category">{categoryName(round.categoryId)}</span>
            <h1 className="duel-round-title">{round.challenge.title}</h1>
            <p className="duel-prompt">{round.challenge.prompt}</p>
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

      {ended && <RevealPanel ended={ended} match={match} nextRoundAt={nextRoundAt} />}

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
      <span className="duel-timer-bar" aria-hidden="true">
        <span style={{ transform: `scaleX(${fraction})` }} />
      </span>
    </div>
  )
}

function RevealPanel({
  ended,
  match,
  nextRoundAt,
}: {
  ended: RoundEndedEvent
  match: Match
  nextRoundAt: string | null
}) {
  const left = useCountdown(nextRoundAt)
  const isLast = ended.roundNumber >= TOTAL_ROUNDS
  const speedNote = roundSpeedNote(ended.result, ended.youCorrect, ended.opponentCorrect, match.opponent.nickname)
  const upNext = isLast ? 'Results are coming up.' : 'Next round is coming up.'

  return (
    <section className={`duel-reveal is-${ended.result}`} aria-live="polite" aria-label="Round result">
      <div className="duel-reveal-head">
        <h2 className="duel-reveal-title">{ROUND_RESULT_LABELS[ended.result]}</h2>
        <div className="duel-reveal-players">
          <PlayerOutcome name="You" answered={ended.youAnswered} correct={ended.youCorrect} />
          <PlayerOutcome
            name={match.opponent.nickname}
            answered={ended.opponentAnswered}
            correct={ended.opponentCorrect}
          />
        </div>
      </div>
      {speedNote && <p className="duel-reveal-note">{speedNote}</p>}
      <p className="duel-reveal-explanation">{ended.reveal.explanation}</p>
      <p className="duel-muted">
        {left !== null && left > 0 && !isLast ? `Next round in ${Math.ceil(left / 1000)} s.` : upNext}
      </p>
    </section>
  )
}

function PlayerOutcome({ name, answered, correct }: { name: string; answered: boolean; correct: boolean }) {
  return (
    <span className="duel-reveal-player">
      <span className="duel-reveal-player-name">{name}</span>
      {correct ? (
        <StatusTag tone="correct">Correct</StatusTag>
      ) : (
        <StatusTag tone="wrong">{answered ? 'Wrong' : 'No answer'}</StatusTag>
      )}
    </span>
  )
}
