import { useCallback, useEffect, useState } from 'react'
import { getCategories, type CategoryInfo } from '../api/categories'
import { Lobby } from '../duel/screens/Lobby'
import { MatchIntro } from '../duel/screens/MatchIntro'
import { Queue } from '../duel/screens/Queue'
import { Results } from '../duel/screens/Results'
import { Review } from '../duel/screens/Review'
import { RoundScreen } from '../duel/screens/RoundScreen'
import type { DuelDetails } from '../duel/types'
import { useDuel } from '../duel/useDuel'
import './DuelPage.css'

interface DuelPageProps {
  onBack: () => void
}

function useCategoryNames() {
  const [categories, setCategories] = useState<CategoryInfo[]>([])

  useEffect(() => {
    let cancelled = false
    getCategories()
      .then((items) => {
        if (!cancelled) setCategories(items)
      })
      .catch(() => {
        // Names are only labels; the duel works without them
      })
    return () => {
      cancelled = true
    }
  }, [])

  return useCallback(
    (id: number) => categories.find((category) => category.id === id)?.name ?? `Category ${id}`,
    [categories],
  )
}

function DuelPage({ onBack }: DuelPageProps) {
  // One connection for the whole Brawl page; it stops when the page unmounts
  const { view, reconnecting, joinQueue, leaveQueue, submitAnswer, backToLobby, retry } = useDuel()
  const categoryName = useCategoryNames()
  const [review, setReview] = useState<DuelDetails | null>(null)

  // Leaving is only offered outside a running duel, where the clock would keep going without you
  const canLeave = ['connecting', 'connectionFailed', 'lobby', 'queue', 'results', 'aborted'].includes(view.phase)

  function handleBack() {
    if (view.phase === 'queue') leaveQueue()
    onBack()
  }

  function playAgain() {
    setReview(null)
    backToLobby()
  }

  return (
    <main className="duel">
      <header className="duel-header">
        {canLeave ? (
          <button type="button" className="duel-back" onClick={handleBack}>
            <i className="ti ti-arrow-left" aria-hidden="true" />
            Back
          </button>
        ) : (
          <span className="duel-live">
            <span className="duel-live-dot" aria-hidden="true" />
            Duel in progress
          </span>
        )}
        <span className="duel-logo">DevBrawl</span>
      </header>

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
            <button type="button" className="duel-primary" onClick={retry}>
              Try again
              <i className="ti ti-refresh" aria-hidden="true" />
            </button>
          </section>
        )}

        {view.phase === 'lobby' && <Lobby error={view.error} onFindDuel={joinQueue} />}

        {view.phase === 'queue' && <Queue since={view.since} onCancel={leaveQueue} />}

        {view.phase === 'countdown' && (
          <MatchIntro match={view.match} startsAt={view.startsAt} categoryName={categoryName} />
        )}

        {view.phase === 'round' && (
          <RoundScreen
            match={view.match}
            current={view.current}
            ended={null}
            nextRoundAt={null}
            categoryName={categoryName}
            onSubmit={(answer) => submitAnswer(view.match.duelId, view.current.round.roundNumber, answer)}
          />
        )}

        {view.phase === 'reveal' && (
          <RoundScreen
            match={view.match}
            current={view.current}
            ended={view.ended}
            nextRoundAt={view.nextRoundAt}
            categoryName={categoryName}
            onSubmit={() => {}}
          />
        )}

        {view.phase === 'results' &&
          (review ? (
            <Review details={review} categoryName={categoryName} onBack={() => setReview(null)} />
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

export default DuelPage
