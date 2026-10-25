import { useRef, useState } from 'react'
import { changeTag } from '../api/account'
import { ApiError } from '../api/client'
import { getOwnedCosmetics } from '../api/store'
import { TAGS, findTag } from './tags'

interface ProfileTagProps {
  tag: string | null
  // Only the player's own tag opens the picker
  editable: boolean
  // Reloads the profile so the new tag shows
  onChanged: () => void
}

// The tag next to the nickname. Other players only see it; on your own profile it opens the tag picker.
function ProfileTag({ tag, editable, onChanged }: ProfileTagProps) {
  const dialog = useRef<HTMLDialogElement>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Tags the player may pick; season tags stay locked until they're unlocked in the season pass
  const [owned, setOwned] = useState<Set<string> | null>(null)

  const current = findTag(tag)

  if (!editable) {
    if (!current) return null
    return (
      <span className="profile-tag">
        <i className={`ti ${current.icon}`} aria-hidden="true" />
        {current.label}
      </span>
    )
  }

  async function pick(id: string | null) {
    setSaving(true)
    setError(null)
    try {
      await changeTag(id)
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
        className={`profile-tag is-editable${current ? '' : ' is-empty'}`}
        aria-label={current ? `Tag: ${current.label}. Change tag` : 'Add a tag'}
        onClick={() => {
          setError(null)
          dialog.current?.showModal()
          getOwnedCosmetics()
            .then((cosmetics) => setOwned(new Set(cosmetics.tags)))
            .catch(() => {})
        }}
      >
        <i className={`ti ${current ? current.icon : 'ti-plus'}`} aria-hidden="true" />
        {current ? current.label : 'Add tag'}
      </button>

      {/* Native dialog, like account settings: focus stays inside, Escape closes it */}
      <dialog
        ref={dialog}
        className="account-dialog"
        aria-labelledby="tag-dialog-title"
        // A click on the backdrop lands on the dialog element itself
        onClick={(event) => {
          if (event.target === event.currentTarget) dialog.current?.close()
        }}
      >
        <div className="account-dialog-head">
          <h2 id="tag-dialog-title" className="account-dialog-title">
            Your tag
          </h2>
          <button type="button" className="account-dialog-close" aria-label="Close" onClick={() => dialog.current?.close()}>
            <i className="ti ti-x" aria-hidden="true" />
          </button>
        </div>

        <ul className="account-menu">
          {TAGS.map((option) => {
            const selected = option.id === tag
            // Until the list arrives, only season tags count as locked
            const locked = option.season && !owned?.has(option.id)
            return (
              <li key={option.id}>
                <button
                  type="button"
                  className={`account-menu-item tag-option${selected ? ' is-current' : ''}${locked ? ' is-locked' : ''}`}
                  aria-pressed={selected}
                  disabled={saving || locked}
                  onClick={() => pick(option.id)}
                >
                  <span className="tag-option-label">
                    <i className={`ti ${option.icon}`} aria-hidden="true" />
                    {option.label}
                  </span>
                  {selected && <i className="ti ti-check" aria-hidden="true" />}
                  {locked && (
                    <span className="tag-option-locked">
                      <i className="ti ti-lock" aria-hidden="true" />
                      Season pass
                    </span>
                  )}
                </button>
              </li>
            )
          })}
        </ul>

        {current && (
          <button type="button" className="tag-remove" disabled={saving} onClick={() => pick(null)}>
            Remove tag
          </button>
        )}

        <p className={`account-status${error ? ' is-error' : ''}`} role="status">
          {saving ? 'Saving…' : error}
        </p>
      </dialog>
    </>
  )
}

export default ProfileTag
