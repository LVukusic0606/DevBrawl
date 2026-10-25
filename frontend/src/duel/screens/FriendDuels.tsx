import { useEffect, useState } from 'react'
import { getFriends, type Friend } from '../../api/friends'
import { AvatarPicture } from '../../profile/AvatarPicture'
import { findAvatar } from '../../profile/avatars'
import { useCountdown } from '../useCountdown'
import type { DuelInvite } from '../types'

// Friendly duels: invites from friends and the list of friends to challenge. No ELO or XP changes.

interface IncomingInvitesProps {
  invites: DuelInvite[]
  onAccept: (inviteId: string) => void
  onDecline: (inviteId: string) => void
}

export function IncomingInvites({ invites, onAccept, onDecline }: IncomingInvitesProps) {
  if (invites.length === 0) return null

  return (
    <ul className="duel-invites" aria-label="Duel invites">
      {invites.map((invite) => (
        <IncomingInvite key={invite.inviteId} invite={invite} onAccept={onAccept} onDecline={onDecline} />
      ))}
    </ul>
  )
}

function IncomingInvite({
  invite,
  onAccept,
  onDecline,
}: {
  invite: DuelInvite
  onAccept: (inviteId: string) => void
  onDecline: (inviteId: string) => void
}) {
  const seconds = Math.ceil((useCountdown(invite.expiresAt) ?? 0) / 1000)

  return (
    <li className="duel-invite">
      <i className="ti ti-swords duel-invite-icon" aria-hidden="true" />
      <p className="duel-invite-text">
        <strong>{invite.from.nickname}</strong> wants a friendly duel.
        <span className="duel-invite-time"> {seconds}s left</span>
      </p>
      <div className="duel-invite-actions">
        <button type="button" className="duel-secondary" onClick={() => onDecline(invite.inviteId)}>
          Decline
        </button>
        <button type="button" className="duel-secondary is-active" onClick={() => onAccept(invite.inviteId)}>
          <i className="ti ti-check" aria-hidden="true" />
          Accept
        </button>
      </div>
    </li>
  )
}

type FriendsState = { status: 'loading' } | { status: 'error' } | { status: 'ready'; friends: Friend[] }

interface FriendPickerProps {
  onInvite: (friendId: string) => void
  onManageFriends: () => void
}

export function FriendPicker({ onInvite, onManageFriends }: FriendPickerProps) {
  const [state, setState] = useState<FriendsState>({ status: 'loading' })

  useEffect(() => {
    let cancelled = false
    getFriends()
      .then((value) => {
        if (!cancelled) setState({ status: 'ready', friends: value.friends })
      })
      .catch(() => {
        if (!cancelled) setState({ status: 'error' })
      })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <section className="duel-friends" aria-labelledby="friends-title">
      <div className="duel-friends-head">
        <div className="duel-friends-intro">
          <h2 id="friends-title" className="duel-section-title">
            Friendly duel
          </h2>
          <p className="duel-muted">The same five rounds against a friend. Your ELO and XP stay the same.</p>
        </div>
        <button type="button" className="duel-secondary" onClick={onManageFriends}>
          <i className="ti ti-users" aria-hidden="true" />
          Manage friends
        </button>
      </div>

      {state.status === 'loading' && <p className="duel-muted">Loading your friends…</p>}
      {state.status === 'error' && <p className="duel-error">Couldn't load your friends. Try again later.</p>}
      {state.status === 'ready' && state.friends.length === 0 && (
        <p className="duel-muted duel-friends-empty">
          <i className="ti ti-user-plus" aria-hidden="true" />
          No friends yet. Add one to play a friendly duel.
        </p>
      )}
      {state.status === 'ready' && state.friends.length > 0 && (
        <ul className="duel-friend-list">
          {state.friends.map(({ user }) => (
            <li key={user.id} className="duel-friend">
              <span className="duel-friend-avatar">
                <AvatarPicture avatar={findAvatar(user.avatarId)} nickname={user.nickname} />
              </span>
              <span className="duel-friend-who">
                <span className="duel-friend-name" title={user.nickname}>
                  {user.nickname}
                </span>
                <span className="duel-friend-rating">ELO {user.rating}</span>
              </span>
              <button type="button" className="duel-secondary" onClick={() => onInvite(user.id)}>
                <i className="ti ti-swords" aria-hidden="true" />
                Challenge
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
