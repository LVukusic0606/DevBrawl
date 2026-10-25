import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { ApiError } from '../api/client'
import {
  acceptFriendRequest,
  deleteFriendRequest,
  getFriends,
  removeFriend,
  sendFriendRequest,
  type FriendUser,
  type Friends,
} from '../api/friends'
import { AvatarPicture } from '../profile/AvatarPicture'
import { findAvatar } from '../profile/avatars'
import { formatDate } from '../profile/format'
import './FriendsPage.css'

interface FriendsPageProps {
  onBack: () => void
  onOpenProfile: (userId: string) => void
  // Opens the Brawl page and invites this friend to a friendly duel
  onChallenge: (friendId: string) => void
}

type LoadState = { status: 'loading' } | { status: 'error'; message: string } | { status: 'ready'; friends: Friends }

function errorMessage(error: unknown, fallback: string) {
  return error instanceof ApiError ? error.message : fallback
}

function FriendsPage({ onBack, onOpenProfile, onChallenge }: FriendsPageProps) {
  const [state, setState] = useState<LoadState>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)
  const [nickname, setNickname] = useState('')
  const [sending, setSending] = useState(false)
  const [sendResult, setSendResult] = useState<{ ok: boolean; message: string } | null>(null)
  // The request or friend whose button is waiting for the server
  const [busyId, setBusyId] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  // Removing a friend takes a second click on the same row
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    getFriends()
      .then((friends) => {
        if (!cancelled) setState({ status: 'ready', friends })
      })
      .catch((error: unknown) => {
        if (!cancelled) setState({ status: 'error', message: errorMessage(error, "Couldn't load your friends. Try again.") })
      })
    return () => {
      cancelled = true
    }
  }, [attempt])

  async function handleSend(event: FormEvent) {
    event.preventDefault()
    const wanted = nickname.trim()
    if (!wanted || sending) return

    setSending(true)
    setSendResult(null)
    try {
      const friends = await sendFriendRequest(wanted)
      setState({ status: 'ready', friends })
      setNickname('')
      // Adding someone who had already asked you makes you friends right away
      const nowFriends = friends.friends.some((f) => f.user.nickname.toLowerCase() === wanted.toLowerCase())
      setSendResult({ ok: true, message: nowFriends ? `You and ${wanted} are now friends.` : `Request sent to ${wanted}.` })
    } catch (error) {
      setSendResult({ ok: false, message: errorMessage(error, "Couldn't send the request. Try again.") })
    } finally {
      setSending(false)
    }
  }

  async function run(id: string, action: () => Promise<Friends>) {
    setBusyId(id)
    setActionError(null)
    try {
      setState({ status: 'ready', friends: await action() })
    } catch (error) {
      setActionError(errorMessage(error, 'Something went wrong. Try again.'))
    } finally {
      setBusyId(null)
      setConfirmRemove(null)
    }
  }

  return (
    <main className="friends">
      <header className="friends-header">
        <button type="button" className="friends-button" onClick={onBack}>
          <i className="ti ti-arrow-left" aria-hidden="true" />
          Back
        </button>
        <span className="friends-logo">DevBrawl</span>
      </header>

      <div className="friends-content">
        <div className="friends-intro">
          <h1 className="friends-title">Friends</h1>
          <p className="friends-lead">Challenge friends to friendly duels. They don't change your ELO or XP.</p>
        </div>

        <form className="friends-add" onSubmit={handleSend}>
          <label htmlFor="friend-nickname" className="friends-label">
            Add a friend
          </label>
          <div className="friends-add-row">
            <input
              id="friend-nickname"
              className="friends-field"
              value={nickname}
              onChange={(event) => setNickname(event.target.value)}
              placeholder="Their nickname"
              maxLength={30}
              autoComplete="off"
            />
            <button type="submit" className="friends-primary" disabled={sending || nickname.trim() === ''}>
              <i className="ti ti-user-plus" aria-hidden="true" />
              {sending ? 'Sending…' : 'Send request'}
            </button>
          </div>
          {sendResult && (
            <p className={sendResult.ok ? 'friends-success' : 'friends-error'} role="status">
              {sendResult.message}
            </p>
          )}
        </form>

        {state.status === 'loading' && <p className="friends-muted">Loading your friends…</p>}

        {state.status === 'error' && (
          <div className="friends-status">
            <p className="friends-error">{state.message}</p>
            <button
              type="button"
              className="friends-button"
              onClick={() => {
                setState({ status: 'loading' })
                setAttempt((n) => n + 1)
              }}
            >
              Try again
            </button>
          </div>
        )}

        {state.status === 'ready' && (
          <>
            {actionError && <p className="friends-error">{actionError}</p>}

            {state.friends.incoming.length > 0 && (
              <Section title="Requests" count={state.friends.incoming.length}>
                {state.friends.incoming.map((request) => (
                  <FriendRow
                    key={request.id}
                    user={request.user}
                    detail={`Sent ${formatDate(request.sentAt)}`}
                    onOpenProfile={onOpenProfile}
                  >
                    <button
                      type="button"
                      className="friends-button"
                      disabled={busyId === request.id}
                      onClick={() => run(request.id, () => deleteFriendRequest(request.id))}
                    >
                      Decline
                    </button>
                    <button
                      type="button"
                      className="friends-button is-duel"
                      disabled={busyId === request.id}
                      onClick={() => run(request.id, () => acceptFriendRequest(request.id))}
                    >
                      <i className="ti ti-check" aria-hidden="true" />
                      Accept
                    </button>
                  </FriendRow>
                ))}
              </Section>
            )}

            <Section title="Your friends" count={state.friends.friends.length}>
              {state.friends.friends.length === 0 && (
                <p className="friends-empty">
                  <i className="ti ti-users" aria-hidden="true" />
                  No friends yet. Add one by their nickname above.
                </p>
              )}
              {state.friends.friends.map(({ user, since }) => (
                <FriendRow
                  key={user.id}
                  user={user}
                  detail={`Friends since ${formatDate(since)}`}
                  onOpenProfile={onOpenProfile}
                >
                  {confirmRemove === user.id ? (
                    <>
                      <button type="button" className="friends-button" onClick={() => setConfirmRemove(null)}>
                        Keep
                      </button>
                      <button
                        type="button"
                        className="friends-button is-danger"
                        disabled={busyId === user.id}
                        onClick={() => run(user.id, () => removeFriend(user.id))}
                      >
                        Remove {user.nickname}
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        className="friends-button is-icon"
                        aria-label={`Remove ${user.nickname}`}
                        onClick={() => setConfirmRemove(user.id)}
                      >
                        <i className="ti ti-user-minus" aria-hidden="true" />
                      </button>
                      <button type="button" className="friends-button is-duel" onClick={() => onChallenge(user.id)}>
                        <i className="ti ti-swords" aria-hidden="true" />
                        Challenge
                      </button>
                    </>
                  )}
                </FriendRow>
              ))}
            </Section>

            {state.friends.outgoing.length > 0 && (
              <Section title="Sent requests" count={state.friends.outgoing.length}>
                {state.friends.outgoing.map((request) => (
                  <FriendRow
                    key={request.id}
                    user={request.user}
                    detail={`Sent ${formatDate(request.sentAt)}`}
                    onOpenProfile={onOpenProfile}
                  >
                    <button
                      type="button"
                      className="friends-button"
                      disabled={busyId === request.id}
                      onClick={() => run(request.id, () => deleteFriendRequest(request.id))}
                    >
                      Withdraw
                    </button>
                  </FriendRow>
                ))}
              </Section>
            )}
          </>
        )}
      </div>
    </main>
  )
}

function Section({ title, count, children }: { title: string; count: number; children: ReactNode }) {
  const id = `friends-${title.toLowerCase().replace(/\s+/g, '-')}`
  return (
    <section className="friends-section" aria-labelledby={id}>
      <h2 id={id} className="friends-section-title">
        {title}
        <span className="friends-count">{count}</span>
      </h2>
      <div className="friends-list">{children}</div>
    </section>
  )
}

interface FriendRowProps {
  user: FriendUser
  detail: string
  onOpenProfile: (userId: string) => void
  children: ReactNode
}

function FriendRow({ user, detail, onOpenProfile, children }: FriendRowProps) {
  return (
    <div className="friends-row">
      <button type="button" className="friends-player" onClick={() => onOpenProfile(user.id)}>
        <span className="friends-avatar" aria-hidden="true">
          <AvatarPicture avatar={findAvatar(user.avatarId)} nickname={user.nickname} />
        </span>
        <span className="friends-player-text">
          <span className="friends-player-name">{user.nickname}</span>
          <span className="friends-player-detail">{detail}</span>
        </span>
      </button>
      <span className="friends-rating" aria-label={`Overall ELO ${user.rating}`}>
        <span className="friends-rating-label">ELO</span>
        {user.rating}
      </span>
      <div className="friends-actions">{children}</div>
    </div>
  )
}

export default FriendsPage
