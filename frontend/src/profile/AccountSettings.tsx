import { useRef, useState, type FormEvent } from 'react'
import { changeEmail, changeNickname, changePassword } from '../api/account'
import { ApiError } from '../api/client'

interface Field {
  name: string
  label: string
  type: 'text' | 'email' | 'password'
  autoComplete: string
  minLength?: number
  maxLength?: number
}

interface Setting {
  id: 'nickname' | 'email' | 'password'
  label: string
  description: string
  fields: Field[]
  submitLabel: string
  successMessage: string
}

const CURRENT_PASSWORD: Field = {
  name: 'currentPassword',
  label: 'Current password',
  type: 'password',
  autoComplete: 'current-password',
}

const SETTINGS: Setting[] = [
  {
    id: 'nickname',
    label: 'Nickname',
    description: 'The name other players see.',
    fields: [{ name: 'nickname', label: 'New nickname', type: 'text', autoComplete: 'nickname', minLength: 3, maxLength: 30 }],
    submitLabel: 'Change nickname',
    successMessage: 'Nickname changed.',
  },
  {
    id: 'email',
    label: 'Email',
    description: 'The email you log in with.',
    fields: [{ name: 'email', label: 'New email', type: 'email', autoComplete: 'email', maxLength: 254 }, CURRENT_PASSWORD],
    submitLabel: 'Change email',
    successMessage: 'Email changed.',
  },
  {
    id: 'password',
    label: 'Password',
    description: 'Other devices are logged out after the change.',
    fields: [
      CURRENT_PASSWORD,
      { name: 'newPassword', label: 'New password', type: 'password', autoComplete: 'new-password', minLength: 8, maxLength: 72 },
    ],
    submitLabel: 'Change password',
    successMessage: 'Password changed. Other devices were logged out.',
  },
]

function save(setting: Setting['id'], v: Record<string, string>) {
  if (setting === 'nickname') return changeNickname(v.nickname)
  if (setting === 'email') return changeEmail(v.email, v.currentPassword)
  return changePassword(v.currentPassword, v.newPassword)
}

type Status = { kind: 'idle' } | { kind: 'saving' } | { kind: 'saved' } | { kind: 'error'; message: string }

// The backend validates everything; the browser only checks lengths and formats
function SettingForm({ setting, onSaved }: { setting: Setting; onSaved: () => void }) {
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(setting.fields.map((f) => [f.name, ''])),
  )
  const [status, setStatus] = useState<Status>({ kind: 'idle' })

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setStatus({ kind: 'saving' })
    try {
      await save(setting.id, values)
      setValues(Object.fromEntries(setting.fields.map((f) => [f.name, ''])))
      setStatus({ kind: 'saved' })
      onSaved()
    } catch (error) {
      setStatus({
        kind: 'error',
        message: error instanceof ApiError ? error.message : 'Something went wrong. Try again.',
      })
    }
  }

  return (
    <form className="account-form" onSubmit={handleSubmit}>
      {setting.fields.map((field, index) => (
        <label key={field.name} className="account-field">
          <span>{field.label}</span>
          <input
            className="account-input"
            type={field.type}
            autoComplete={field.autoComplete}
            autoFocus={index === 0}
            required
            minLength={field.minLength}
            maxLength={field.maxLength}
            value={values[field.name]}
            onChange={(e) => {
              setValues((v) => ({ ...v, [field.name]: e.target.value }))
              if (status.kind !== 'saving') setStatus({ kind: 'idle' })
            }}
          />
        </label>
      ))}
      <p className={`account-status${status.kind === 'error' ? ' is-error' : ''}`} role="status">
        {status.kind === 'saved' && (
          <>
            <i className="ti ti-check" aria-hidden="true" /> {setting.successMessage}
          </>
        )}
        {status.kind === 'error' && status.message}
      </p>
      <button type="submit" className="profile-button is-accent" disabled={status.kind === 'saving'}>
        {status.kind === 'saving' ? 'Saving…' : setting.submitLabel}
      </button>
    </form>
  )
}

// A small button that opens the account settings in a modal. Only shown on the player's own profile.
// onNicknameChanged reloads the profile so the new name shows behind the modal.
function AccountSettings({ onNicknameChanged }: { onNicknameChanged: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null)
  const [selected, setSelected] = useState<Setting | null>(null)

  function close() {
    dialog.current?.close()
  }

  return (
    <>
      <button
        type="button"
        className="profile-button"
        onClick={() => {
          setSelected(null)
          dialog.current?.showModal()
        }}
      >
        <i className="ti ti-settings" aria-hidden="true" />
        Account settings
      </button>

      {/* Native dialog: focus stays inside, Escape closes it */}
      <dialog
        ref={dialog}
        className="account-dialog"
        aria-labelledby="account-dialog-title"
        onClose={() => setSelected(null)}
        // A click on the backdrop lands on the dialog element itself
        onClick={(event) => {
          if (event.target === event.currentTarget) close()
        }}
      >
        <div className="account-dialog-head">
          {selected ? (
            <button type="button" className="account-dialog-back" onClick={() => setSelected(null)}>
              <i className="ti ti-arrow-left" aria-hidden="true" />
              <span id="account-dialog-title">{selected.label}</span>
            </button>
          ) : (
            <h2 id="account-dialog-title" className="account-dialog-title">
              Account settings
            </h2>
          )}
          <button type="button" className="account-dialog-close" aria-label="Close" onClick={close}>
            <i className="ti ti-x" aria-hidden="true" />
          </button>
        </div>

        {selected ? (
          <SettingForm
            key={selected.id}
            setting={selected}
            onSaved={selected.id === 'nickname' ? onNicknameChanged : () => {}}
          />
        ) : (
          <ul className="account-menu">
            {SETTINGS.map((setting) => (
              <li key={setting.id}>
                <button type="button" className="account-menu-item" onClick={() => setSelected(setting)}>
                  <span>
                    <span className="account-menu-label">Change {setting.label.toLowerCase()}</span>
                    <span className="account-menu-desc">{setting.description}</span>
                  </span>
                  <i className="ti ti-chevron-right" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </dialog>
    </>
  )
}

export default AccountSettings
