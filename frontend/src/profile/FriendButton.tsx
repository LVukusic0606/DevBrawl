import { useState } from 'react'
import { ApiError } from '../api/client'
import { acceptFriendRequest, deleteFriendRequest, sendFriendRequest, type Friends } from '../api/friends'
import type { Profile } from '../api/profiles'

interface FriendButtonProps {
  nickname: string
  userId: string
  friendship: NonNullable<Profile['friendship']>
  // Reloads the profile so the new friendship state shows
  onChanged: () => void
  onChallenge: (friendId: string) => void
}

// Add, accept or withdraw a friend request from another player's profile; friends get a Challenge button
function FriendButton({ nickname, userId, friendship, onChanged, onChallenge }: FriendButtonProps) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function run(action: () => Promise<Friends>) {
    setBusy(true)
    setError(null)
    try {
      await action()
      onChanged()
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Something went wrong. Try again.')
    } finally {
      setBusy(false)
    }
  }

  const { state, requestId } = friendship

  return (
    <>
      {state === 'none' && (
        <button type="button" className="profile-button" disabled={busy} onClick={() => run(() => sendFriendRequest(nickname))}>
          <i className="ti ti-user-plus" aria-hidden="true" />
          Add friend
        </button>
      )}

      {state === 'requestReceived' && requestId && (
        <button type="button" className="profile-button" disabled={busy} onClick={() => run(() => acceptFriendRequest(requestId))}>
          <i className="ti ti-user-check" aria-hidden="true" />
          Accept friend request
        </button>
      )}

      {state === 'requestSent' && requestId && (
        <>
          <span className="profile-friend-status">
            <i className="ti ti-clock" aria-hidden="true" />
            Request sent
          </span>
          <button type="button" className="profile-button" disabled={busy} onClick={() => run(() => deleteFriendRequest(requestId))}>
            Withdraw
          </button>
        </>
      )}

      {state === 'friends' && (
        <>
          <span className="profile-friend-status">
            <i className="ti ti-user-check" aria-hidden="true" />
            Friends
          </span>
          <button type="button" className="profile-button" onClick={() => onChallenge(userId)}>
            <i className="ti ti-swords" aria-hidden="true" />
            Friendly duel
          </button>
        </>
      )}

      {error && <p className="profile-error">{error}</p>}
    </>
  )
}

export default FriendButton
