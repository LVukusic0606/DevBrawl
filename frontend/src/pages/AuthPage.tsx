import { useState, type FormEvent, type ReactNode } from 'react'
import mascotUrl from '../assets/mascot.webp'
import { ApiError } from '../api/client'
import { GoogleSignInButton } from '../auth/GoogleSignInButton'
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

// After Google sign-in: logged in, or a new account that still needs a username
export type GoogleOutcome =
  | { status: 'loggedIn' }
  | { status: 'usernameRequired'; email: string; suggestedUsername: string }

interface AuthPageProps {
  // Reject with an ApiError to show its message on the form
  onLogin: (values: LoginValues) => Promise<void>
  onSignup: (values: SignupValues) => Promise<void>
  // username is only sent for a new account, after usernameRequired
  onGoogle: (idToken: string, username: string | undefined, rememberMe: boolean) => Promise<GoogleOutcome>
}

// A Google account signing in for the first time, waiting for its username
interface GoogleSignup {
  idToken: string
  email: string
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
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [googleSignup, setGoogleSignup] = useState<GoogleSignup | null>(null)
  const typedWord = useTypewriter(HEADLINE_WORDS)

  const isSignup = mode === 'signup'

  function switchMode(next: AuthMode) {
    setMode(next)
    setErrors({})
    setFormError(null)
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

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submitting) return

    const found = validate()
    setErrors(found)
    setFormError(null)
    if (Object.keys(found).length > 0) return

    setSubmitting(true)
    try {
      if (isSignup) {
        await onSignup({ email: email.trim(), username, password })
      } else {
        await onLogin({ email: email.trim(), password, rememberMe })
      }
    } catch (error) {
      setFormError(error instanceof ApiError ? error.message : "Couldn't connect. Try again.")
    } finally {
      setSubmitting(false)
    }
  }

  async function handleGoogleCredential(idToken: string) {
    if (submitting) return
    setFormError(null)
    setSubmitting(true)
    try {
      const outcome = await onGoogle(idToken, undefined, rememberMe)
      if (outcome.status === 'usernameRequired') {
        setGoogleSignup({ idToken, email: outcome.email })
        setUsername(outcome.suggestedUsername)
        setErrors({})
      }
    } catch (error) {
      setFormError(error instanceof ApiError ? error.message : "Couldn't connect. Try again.")
    } finally {
      setSubmitting(false)
    }
  }

  async function handleGoogleUsername(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submitting || !googleSignup) return

    const found: Errors = USERNAME_PATTERN.test(username) ? {} : { username: 'Use 3 to 20 letters, numbers or underscores.' }
    setErrors(found)
    setFormError(null)
    if (found.username) return

    setSubmitting(true)
    try {
      await onGoogle(googleSignup.idToken, username, rememberMe)
    } catch (error) {
      // Google's token is only valid for about an hour; after that the user has to pick their account again
      if (error instanceof ApiError && error.status === 400) setGoogleSignup(null)
      setFormError(error instanceof ApiError ? error.message : "Couldn't connect. Try again.")
    } finally {
      setSubmitting(false)
    }
  }

  function cancelGoogleSignup() {
    setGoogleSignup(null)
    setUsername('')
    setErrors({})
    setFormError(null)
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

          {googleSignup ? (
          <section className="auth-form-pane" aria-labelledby="auth-title">
            <header className="auth-header">
              <h1 id="auth-title" className="auth-title">
                Pick a username
              </h1>
              <p className="auth-switch">
                Signed in with Google as {googleSignup.email}. This is the name other players see.
              </p>
            </header>

            <form className="auth-form" onSubmit={handleGoogleUsername} noValidate>
              <Field
                id="auth-google-username"
                label="Username"
                type="text"
                value={username}
                autoComplete="username"
                error={errors.username}
                onChange={setUsername}
              />

              {formError && (
                <p className="auth-error" role="alert">{formError}</p>
              )}

              <button type="submit" className="auth-submit" disabled={submitting}>
                {submitting ? 'Creating account' : 'Create account'}
              </button>
            </form>

            <p className="auth-switch">
              Not you?{' '}
              <button type="button" className="auth-link" onClick={cancelGoogleSignup} disabled={submitting}>
                Use another account
                <i className="ti ti-arrow-right" aria-hidden="true" />
              </button>
            </p>
          </section>
          ) : (
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

              {formError && (
                <p className="auth-error" role="alert">{formError}</p>
              )}

              <button type="submit" className="auth-submit" disabled={submitting}>
                {submitting
                  ? isSignup ? 'Creating account' : 'Logging in'
                  : isSignup ? 'Create account' : 'Log in'}
              </button>
            </form>

            <GoogleSignInButton
              onCredential={handleGoogleCredential}
              before={
                <div className="auth-divider" role="separator">
                  <span>{isSignup ? 'Or register with' : 'Or log in with'}</span>
                </div>
              }
            />
          </section>
          )}
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

export default AuthPage
