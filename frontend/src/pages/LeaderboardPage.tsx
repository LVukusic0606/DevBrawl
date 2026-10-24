import { useEffect, useState } from 'react'
import { ApiError } from '../api/client'
import { getLeaderboard, type Leaderboard, type LeaderboardEntry } from '../api/leaderboard'
import { TIER_LABELS } from '../profile/format'
import './LeaderboardPage.css'

interface LeaderboardPageProps {
  onBack: () => void
  onOpenProfile: (userId: string) => void
  onStartDuel: () => void
}

type LoadState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; board: Leaderboard }

function LeaderboardPage({ onBack, onOpenProfile, onStartDuel }: LeaderboardPageProps) {
  const [state, setState] = useState<LoadState>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let cancelled = false
    getLeaderboard()
      .then((board) => {
        if (!cancelled) setState({ status: 'ready', board })
      })
      .catch((error: unknown) => {
        if (cancelled) return
        const message = error instanceof ApiError ? error.message : "Couldn't load the leaderboard. Try again."
        setState({ status: 'error', message })
      })
    return () => {
      cancelled = true
    }
  }, [attempt])

  return (
    <main className="leaderboard">
      <header className="leaderboard-header">
        <button type="button" className="leaderboard-back" onClick={onBack}>
          <i className="ti ti-arrow-left" aria-hidden="true" />
          Back
        </button>
        <span className="leaderboard-logo">DevBrawl</span>
      </header>

      <div className="leaderboard-content">
        <div className="leaderboard-heading">
          <h1 className="leaderboard-title">Leaderboard</h1>
          <p className="leaderboard-note">
            Ranked by overall rating: the average of each player's ratings in all categories. Only players who finished a
            duel are listed.
          </p>
        </div>

        {state.status === 'loading' && <p className="leaderboard-muted">Loading leaderboard…</p>}

        {state.status === 'error' && (
          <div className="leaderboard-status">
            <p className="leaderboard-error">{state.message}</p>
            <button
              type="button"
              className="leaderboard-back"
              onClick={() => {
                setState({ status: 'loading' })
                setAttempt((n) => n + 1)
              }}
            >
              Try again
            </button>
          </div>
        )}

        {state.status === 'ready' && state.board.entries.length === 0 && (
          <div className="leaderboard-empty">
            <i className="ti ti-trophy" aria-hidden="true" />
            <p>No finished duels yet. The first duel puts you on the board.</p>
            <button type="button" className="leaderboard-primary" onClick={onStartDuel}>
              Start a duel
            </button>
          </div>
        )}

        {state.status === 'ready' && state.board.entries.length > 0 && (
          <BoardTable board={state.board} onOpenProfile={onOpenProfile} />
        )}
      </div>
    </main>
  )
}

function BoardTable({ board, onOpenProfile }: { board: Leaderboard; onOpenProfile: (userId: string) => void }) {
  return (
    <div className="leaderboard-panel">
      <table className="leaderboard-table">
        <caption className="leaderboard-sr-only">Overall leaderboard</caption>
        <thead>
          <tr>
            <th scope="col" className="is-position">
              #
            </th>
            <th scope="col">Player</th>
            <th scope="col" className="is-number">
              Rating
            </th>
            <th scope="col">Tier</th>
            <th scope="col" className="is-number">
              Duels
            </th>
            <th scope="col" className="is-number">
              Wins
            </th>
          </tr>
        </thead>
        <tbody>
          {board.entries.map((entry) => (
            <Row key={entry.userId} entry={entry} onOpenProfile={onOpenProfile} />
          ))}
        </tbody>
        {board.you && (
          // Your own place when you're below the shown rows
          <tbody className="leaderboard-you">
            <Row entry={board.you} onOpenProfile={onOpenProfile} />
          </tbody>
        )}
      </table>
      <p className="leaderboard-count">
        {board.totalPlayers} {board.totalPlayers === 1 ? 'player' : 'players'} ranked
      </p>
    </div>
  )
}

function Row({ entry, onOpenProfile }: { entry: LeaderboardEntry; onOpenProfile: (userId: string) => void }) {
  const podium = entry.position <= 3
  return (
    <tr className={`${entry.isYou ? 'is-you' : ''}${podium ? ' is-podium' : ''}`}>
      <td className="is-position">
        <span className="leaderboard-position">
          {podium && <i className="ti ti-trophy" aria-hidden="true" />}
          {entry.position}
        </span>
      </td>
      <td>
        <button type="button" className="leaderboard-player" onClick={() => onOpenProfile(entry.userId)}>
          {entry.nickname}
        </button>
        {entry.isYou && <span className="leaderboard-you-tag">You</span>}
      </td>
      <td className="is-number leaderboard-rating">{entry.rating}</td>
      <td className="leaderboard-tier">{TIER_LABELS[entry.tier]}</td>
      <td className="is-number">{entry.duelsPlayed}</td>
      <td className="is-number">{entry.wins}</td>
    </tr>
  )
}

export default LeaderboardPage
