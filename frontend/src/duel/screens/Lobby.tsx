import { useEffect, useState } from 'react'
import { getRecentDuels } from '../../api/duels'
import bugDuel from '../../assets/bug-duel.webp'
import { ROUND_TYPES } from '../rounds'
import type { DuelResult, DuelSummary } from '../types'

const RESULT_LABELS: Record<DuelResult, string> = { won: 'Won', lost: 'Lost', draw: 'Draw' }

interface LobbyProps {
  error: string | null
  onFindDuel: () => void
}

export function Lobby({ error, onFindDuel }: LobbyProps) {
  return (
    <div className="duel-lobby">
      <section className="duel-lobby-main" aria-labelledby="lobby-title">
        <p className="duel-eyebrow">Brawl · 1v1</p>
        <h1 id="lobby-title" className="duel-hero-title">
          Prove it in the arena.
        </h1>
        <p className="duel-lead">
          Two players, the same five challenges, at the same time. Each round counts toward the rating of its own
          category.
        </p>

        <ol className="duel-round-list">
          {ROUND_TYPES.map((round, index) => (
            <li key={round.type} className="duel-round-item">
              <span className="duel-round-number">{index + 1}</span>
              <i className={`ti ${round.icon}`} aria-hidden="true" />
              <span className="duel-round-name">{round.name}</span>
              <span className="duel-round-task">{round.task}</span>
            </li>
          ))}
        </ol>

        <div className="duel-lobby-actions">
          <button type="button" className="duel-primary is-large" onClick={onFindDuel}>
            Find duel
            <i className="ti ti-swords" aria-hidden="true" />
          </button>
          {error && <p className="duel-error">{error}</p>}
        </div>
      </section>

      <aside className="duel-lobby-side">
        <img className="duel-lobby-bug" src={bugDuel} alt="" />
        <RecentDuels />
      </aside>
    </div>
  )
}

function RecentDuels() {
  const [duels, setDuels] = useState<DuelSummary[] | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let cancelled = false
    getRecentDuels(5)
      .then((items) => {
        if (!cancelled) setDuels(items)
      })
      .catch(() => {
        if (!cancelled) setFailed(true)
      })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <section className="duel-recent" aria-labelledby="recent-title">
      <h2 id="recent-title" className="duel-section-title">
        Recent duels
      </h2>
      {failed && <p className="duel-error">Couldn't load your duels.</p>}
      {!failed && duels === null && <p className="duel-muted">Loading duels…</p>}
      {duels?.length === 0 && (
        <p className="duel-muted">
          <i className="ti ti-swords" aria-hidden="true" /> No duels yet. Start your first one.
        </p>
      )}
      {duels && duels.length > 0 && (
        <ul className="duel-recent-list">
          {duels.map((duel) => (
            <li key={duel.id} className="duel-recent-item">
              <span className="duel-recent-opponent">vs {duel.opponent.nickname}</span>
              <span className="duel-recent-score">
                {duel.yourScore}–{duel.opponentScore}
              </span>
              <span className={`duel-recent-result is-${duel.result ?? duel.status}`}>
                {duel.result ? RESULT_LABELS[duel.result] : duel.status === 'inProgress' ? 'Running' : 'Abandoned'}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
