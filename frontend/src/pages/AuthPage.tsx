import { useState, type FormEvent, type ReactNode } from 'react'
import mascotUrl from '../assets/mascot.webp'
import { useTypewriter } from '../hooks/useTypewriter'
import './AuthPage.css'

export type AuthMode = 'login' | 'signup'

export interface LoginValues {
  email: string
  password: string
  rememberMe: boolean
}

export interface SignupValues {
  email: string
  username: string
  password: string
}

interface AuthPageProps {
  onLogin: (values: LoginValues) => void
  onSignup: (values: SignupValues) => void
  onGoogle: () => void
}

type Errors = Partial<Record<'email' | 'username' | 'password' | 'confirmPassword', string>>

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const USERNAME_PATTERN = /^[A-Za-z0-9_]{3,20}$/
const MIN_PASSWORD_LENGTH = 8
const HEADLINE_WORDS = ['Prove it.', 'Solve it.']

function AuthPage({ onLogin, onSignup, onGoogle }: AuthPageProps) {
  const [mode, setMode] = useState<AuthMode>('login')
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [errors, setErrors] = useState<Errors>({})
  const typedWord = useTypewriter(HEADLINE_WORDS)

  const isSignup = mode === 'signup'

  function switchMode(next: AuthMode) {
    setMode(next)
    setErrors({})
    setShowPassword(false)
  }

  function validate(): Errors {
    const next: Errors = {}

    if (!EMAIL_PATTERN.test(email.trim())) {
      next.email = 'Enter a valid email address.'
    }

    if (isSignup) {
      if (!USERNAME_PATTERN.test(username)) {
        next.username = 'Use 3 to 20 letters, numbers or underscores.'
      }
      if (password.length < MIN_PASSWORD_LENGTH) {
        next.password = `Use at least ${MIN_PASSWORD_LENGTH} characters.`
      }
      if (confirmPassword.length === 0) {
        next.confirmPassword = 'Repeat your password.'
      } else if (confirmPassword !== password) {
        next.confirmPassword = 'Passwords do not match.'
      }
    } else if (password.length === 0) {
      next.password = 'Enter your password.'
    }

    return next
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const found = validate()
    setErrors(found)
    if (Object.keys(found).length > 0) return

    if (isSignup) {
      onSignup({ email: email.trim(), username, password })
    } else {
      onLogin({ email: email.trim(), password, rememberMe })
    }
  }

  const passwordToggle = (
    <button
      type="button"
      className="auth-toggle"
      onClick={() => setShowPassword((value) => !value)}
      aria-label={showPassword ? 'Hide password' : 'Show password'}
      aria-pressed={showPassword}
    >
      <i className={showPassword ? 'ti ti-eye-off' : 'ti ti-eye'} aria-hidden="true" />
    </button>
  )

  return (
    <main className="auth">
      <div className="auth-window">
        <img
          className="auth-mascot"
          src={mascotUrl}
          alt="Dev_Bug, the DevBrawl mascot, waving hello"
          width={790}
          height={917}
        />

        <div className="auth-window-bar">
          <span className="auth-logo">
            <span className="auth-logo-prompt" aria-hidden="true">&gt;</span>
            DevBrawl
          </span>
          <span className="auth-window-path">~/devbrawl/{isSignup ? 'signup' : 'login'}</span>
        </div>

        <div className="auth-window-body">
          <section className="auth-session" aria-label="About DevBrawl">
            <div className="auth-terminal">
              <p className="auth-command">
                <span className="auth-command-prompt" aria-hidden="true">$</span>
                devbrawl --start
              </p>
              <ul className="auth-output">
                <li><span className="auth-output-ok" aria-hidden="true">✓</span>learn programming concepts</li>
                <li><span className="auth-output-ok" aria-hidden="true">✓</span>5-question duels</li>
                <li><span className="auth-output-ok" aria-hidden="true">✓</span>ELO ratings, personalization</li>
              </ul>
            </div>

            <p className="auth-headline">
              <span>Learn it.</span>
              <span className="auth-sr-only">Prove it.</span>
              <span className="auth-headline-typed" aria-hidden="true">
                {typedWord}
                <span className="auth-caret" />
              </span>
            </p>

            <p className="auth-comment">
              // Short lessons on how software really works, then 1v1 duels that test whether you actually understand it.
            </p>
          </section>

          <section className="auth-form-pane" aria-labelledby="auth-title">
            <header className="auth-header">
              <h1 id="auth-title" className="auth-title">
                {isSignup ? 'Create an account' : 'Log in'}
              </h1>
              <p className="auth-switch">
                {isSignup ? 'Already have an account?' : 'New to DevBrawl?'}{' '}
                <button
                  type="button"
                  className="auth-link"
                  onClick={() => switchMode(isSignup ? 'login' : 'signup')}
                >
                  {isSignup ? 'Log in' : 'Create an account'}
                  <i className="ti ti-arrow-right" aria-hidden="true" />
                </button>
              </p>
            </header>

            <form className="auth-form" onSubmit={handleSubmit} noValidate>
              <Field
                id="auth-email"
                label="Email"
                type="email"
                value={email}
                autoComplete="email"
                error={errors.email}
                onChange={setEmail}
              />

              {isSignup && (
                <Field
                  id="auth-username"
                  label="Username"
                  type="text"
                  value={username}
                  autoComplete="username"
                  error={errors.username}
                  onChange={setUsername}
                />
              )}

              <Field
                id="auth-password"
                label={isSignup ? `Password (at least ${MIN_PASSWORD_LENGTH} characters)` : 'Password'}
                type={showPassword ? 'text' : 'password'}
                value={password}
                autoComplete={isSignup ? 'new-password' : 'current-password'}
                error={errors.password}
                onChange={setPassword}
                trailing={passwordToggle}
              />

              {isSignup && (
                <Field
                  id="auth-confirm-password"
                  label="Confirm password"
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  autoComplete="new-password"
                  error={errors.confirmPassword}
                  onChange={setConfirmPassword}
                />
              )}

              {!isSignup && (
                <label className="auth-remember">
                  <input
                    type="checkbox"
                    className="auth-remember-input"
                    checked={rememberMe}
                    onChange={(event) => setRememberMe(event.target.checked)}
                  />
                  <span className="auth-remember-box" aria-hidden="true">
                    <i className="ti ti-check" />
                  </span>
                  <span>Remember me</span>
                </label>
              )}

              <button type="submit" className="auth-submit">
                {isSignup ? 'Create account' : 'Log in'}
              </button>
            </form>

            <div className="auth-divider" role="separator">
              <span>{isSignup ? 'Or register with' : 'Or log in with'}</span>
            </div>

            <button type="button" className="auth-google" onClick={onGoogle}>
              <GoogleLogo />
              Google
            </button>
          </section>
        </div>
      </div>
    </main>
  )
}

interface FieldProps {
  id: string
  label: string
  type: string
  value: string
  autoComplete: string
  error?: string
  onChange: (value: string) => void
  trailing?: ReactNode
}

function Field({ id, label, type, value, autoComplete, error, onChange, trailing }: FieldProps) {
  const errorId = `${id}-error`

  return (
    <div className="auth-field">
      <div className={`auth-input-wrap${error ? ' is-invalid' : ''}`}>
        <input
          id={id}
          className="auth-input"
          type={type}
          value={value}
          autoComplete={autoComplete}
          placeholder={label}
          aria-label={label}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          onChange={(event) => onChange(event.target.value)}
        />
        {trailing}
      </div>
      {error && (
        <p id={errorId} className="auth-error">{error}</p>
      )}
    </div>
  )
}

function GoogleLogo() {
  return (
    <svg className="auth-google-logo" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.1 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.1 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C36.9 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  )
}

export default AuthPage
