import { useRef, useState } from 'react'
import { changeAvatar } from '../api/account'
import { ApiError } from '../api/client'
import { getOwnedCosmetics } from '../api/store'
import { AvatarPicture } from './AvatarPicture'
import { AVATARS, findAvatar } from './avatars'

interface ProfileAvatarProps {
  nickname: string
  avatarId: number | null
  // Only the player's own avatar opens the picker
  editable: boolean
  // Reloads the profile so the new picture shows
  onChanged: () => void
}

// The picture at the top of a profile: the chosen avatar, or the first letter of the nickname
function ProfileAvatar({ nickname, avatarId, editable, onChanged }: ProfileAvatarProps) {
  const dialog = useRef<HTMLDialogElement>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Avatars the player may pick; season avatars stay locked until they're unlocked in the season pass
  const [owned, setOwned] = useState<Set<number> | null>(null)

  const avatar = findAvatar(avatarId)
  const picture = <AvatarPicture avatar={avatar} nickname={nickname} />

  if (!editable) {
    return (
      <span className="profile-avatar" aria-hidden="true">
        {picture}
      </span>
    )
  }

  async function pick(id: number) {
    setSaving(true)
    setError(null)
    try {
      await changeAvatar(id)
      dialog.current?.close()
      onChanged()
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Something went wrong. Try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <button
        type="button"
        className="profile-avatar is-editable"
        aria-label="Change profile picture"
        onClick={() => {
          setError(null)
          dialog.current?.showModal()
          getOwnedCosmetics()
            .then((cosmetics) => setOwned(new Set(cosmetics.avatarIds)))
            .catch(() => {})
        }}
      >
        {picture}
        <span className="profile-avatar-edit" aria-hidden="true">
          <i className="ti ti-pencil" />
        </span>
      </button>

      {/* Native dialog, like account settings: focus stays inside, Escape closes it */}
      <dialog
        ref={dialog}
        className="account-dialog avatar-dialog"
        aria-labelledby="avatar-dialog-title"
        // A click on the backdrop lands on the dialog element itself
        onClick={(event) => {
          if (event.target === event.currentTarget) dialog.current?.close()
        }}
      >
        <div className="account-dialog-head">
          <h2 id="avatar-dialog-title" className="account-dialog-title">
            Profile picture
          </h2>
          <button type="button" className="account-dialog-close" aria-label="Close" onClick={() => dialog.current?.close()}>
            <i className="ti ti-x" aria-hidden="true" />
          </button>
        </div>

        <ul className="avatar-grid">
          {AVATARS.map((option) => {
            const current = option.id === avatarId
            // Until the list arrives, only season avatars count as locked
            const locked = option.season && !owned?.has(option.id)
            return (
              <li key={option.id}>
                <button
                  type="button"
                  className={`avatar-option${current ? ' is-current' : ''}${locked ? ' is-locked' : ''}`}
                  aria-label={locked ? `${option.label}, locked: unlock it in the season pass` : option.label}
                  aria-pressed={current}
                  disabled={saving || locked}
                  onClick={() => pick(option.id)}
                >
                  <AvatarPicture avatar={option} nickname="" />
                  {current && <i className="ti ti-check avatar-option-check" aria-hidden="true" />}
                  {locked && <i className="ti ti-lock avatar-option-lock" aria-hidden="true" />}
                </button>
              </li>
            )
          })}
        </ul>

        <p className={`account-status${error ? ' is-error' : ''}`} role="status">
          {saving ? 'Saving…' : error}
        </p>
      </dialog>
    </>
  )
}

export default ProfileAvatar
