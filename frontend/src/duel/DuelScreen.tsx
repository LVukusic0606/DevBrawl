import { useState } from 'react'
import '../pages/DuelPage.css'
import { Lobby } from './screens/Lobby'
import { MatchIntro } from './screens/MatchIntro'
import { Queue } from './screens/Queue'
import { Results } from './screens/Results'
import { Review } from './screens/Review'
import { RoundScreen } from './screens/RoundScreen'
import type { Answer, DuelDetails } from './types'
import type { DuelView } from './useDuel'

interface DuelScreenProps {
  view: DuelView
  reconnecting: boolean
  categoryName: (id: number) => string
  onBack: () => void
  onFindDuel: () => void
  onCancelQueue: () => void
  onSubmit: (duelId: string, roundNumber: number, answer: Answer) => void
  onPlayAgain: () => void
  onRetry: () => void
}

// Everything the Brawl page shows for a given state; DuelPage feeds it the live duel state.
export function DuelScreen({
  view,
  reconnecting,
  categoryName,
  onBack,
  onFindDuel,
  onCancelQueue,
  onSubmit,
  onPlayAgain,
  onRetry,
}: DuelScreenProps) {
  const [review, setReview] = useState<DuelDetails | null>(null)

  // Leaving is only offered outside a running duel, where the clock would keep going without you.
  // The queue has its own Cancel button, so it shows no Back.
  // The review has its own "Leave duel stats" button, so it shows no Back either.
  const canLeave =
    ['connecting', 'connectionFailed', 'lobby', 'results', 'aborted'].includes(view.phase) && review === null

  function playAgain() {
    setReview(null)
    onPlayAgain()
  }

  return (
    <main className="duel">
      {canLeave && (
        <header className="duel-header">
          <button type="button" className="duel-back" onClick={onBack}>
            <i className="ti ti-arrow-left" aria-hidden="true" />
            Back
          </button>
        </header>
      )}

      {reconnecting && (
        <p className="duel-notice is-floating" role="status">
          <i className="ti ti-refresh" aria-hidden="true" />
          Connection lost. Reconnecting…
        </p>
      )}

      <div className="duel-body">
        {view.phase === 'connecting' && <p className="duel-loading">Connecting to the arena…</p>}

        {view.phase === 'connectionFailed' && (
          <section className="duel-center">
            <p className="duel-error">Couldn't connect to the arena. Try again.</p>
            <button type="button" className="duel-primary" onClick={onRetry}>
              Try again
              <i className="ti ti-refresh" aria-hidden="true" />
            </button>
          </section>
        )}

        {view.phase === 'lobby' && <Lobby error={view.error} onFindDuel={onFindDuel} />}

        {view.phase === 'queue' && <Queue since={view.since} onCancel={onCancelQueue} />}

        {view.phase === 'countdown' && (
          <MatchIntro match={view.match} startsAt={view.startsAt} categoryName={categoryName} />
        )}

        {view.phase === 'round' && (
          <RoundScreen
            match={view.match}
            current={view.current}
            ended={null}
            onSubmit={(answer) => onSubmit(view.match.duelId, view.current.round.roundNumber, answer)}
          />
        )}

        {view.phase === 'reveal' && (
          <RoundScreen
            match={view.match}
            current={view.current}
            ended={view.ended}
            onSubmit={() => {}}
          />
        )}

        {view.phase === 'results' &&
          (review ? (
            <Review details={review} categoryName={categoryName} onLeave={playAgain} />
          ) : (
            <Results
              match={view.match}
              ended={view.ended}
              categoryName={categoryName}
              onReview={setReview}
              onPlayAgain={playAgain}
            />
          ))}

        {view.phase === 'aborted' && (
          <section className="duel-center">
            <p className="duel-eyebrow">Duel stopped</p>
            <h1 className="duel-hero-title">This duel was cancelled.</h1>
            <p className="duel-lead">
              Something went wrong on the server, so the duel doesn't count. {view.reason}
            </p>
            <button type="button" className="duel-primary" onClick={playAgain}>
              Find a new duel
              <i className="ti ti-swords" aria-hidden="true" />
            </button>
          </section>
        )}
      </div>
    </main>
  )
}
