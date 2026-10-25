import bugDuel from '../../assets/bug-duel.webp'
import { ROUND_TYPES } from '../rounds'
import type { DuelInvite } from '../types'
import { FriendPicker, IncomingInvites } from './FriendDuels'

interface LobbyProps {
  error: string | null
  notice: string | null
  incoming: DuelInvite[]
  onFindDuel: () => void
  onInvite: (friendId: string) => void
  onAcceptInvite: (inviteId: string) => void
  onDeclineInvite: (inviteId: string) => void
  onManageFriends: () => void
}

export function Lobby({
  error,
  notice,
  incoming,
  onFindDuel,
  onInvite,
  onAcceptInvite,
  onDeclineInvite,
  onManageFriends,
}: LobbyProps) {
  return (
    <div className="duel-lobby">
      <section className="duel-lobby-intro" aria-labelledby="lobby-title">
        <IncomingInvites invites={incoming} onAccept={onAcceptInvite} onDecline={onDeclineInvite} />
        <h1 id="lobby-title" className="duel-lobby-title">
          Prove your knowledge
        </h1>
        <p className="duel-lead">
          Two players, the same five challenges, at the same time. Each round counts toward the rating of its own
          category.
        </p>
        <div className="duel-lobby-actions">
          <button type="button" className="duel-primary duel-find" onClick={onFindDuel}>
            Find duel
            <i className="ti ti-swords" aria-hidden="true" />
          </button>
          {error && <p className="duel-error">{error}</p>}
          {!error && notice && <p className="duel-muted">{notice}</p>}
        </div>
      </section>

      <img className="duel-lobby-bug" src={bugDuel} alt="" />

      <FriendPicker onInvite={onInvite} onManageFriends={onManageFriends} />

      {/* The five rounds always come in this order, so they read as a timeline */}
      <section className="duel-rounds" aria-labelledby="rounds-title">
        <h2 id="rounds-title" className="duel-rounds-title">
          Five rounds, in this order
        </h2>
        <ol className="duel-timeline">
          {ROUND_TYPES.map((round, index) => (
            <li key={round.type} className="duel-timeline-step">
              <span className="duel-timeline-marker" aria-hidden="true">
                {index + 1}
              </span>
              <span className="duel-timeline-name">
                <i className={`ti ${round.icon}`} aria-hidden="true" />
                {round.name}
              </span>
              <span className="duel-timeline-task">{round.task}</span>
            </li>
          ))}
        </ol>
      </section>
    </div>
  )
}
