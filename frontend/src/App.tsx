import { useEffect, useState } from 'react'
import { getMe, login, logout, signup, type User } from './api/auth'
import { clearSession, loadSession, startSession } from './api/session'
import AuthPage, { type LoginValues, type SignupValues } from './pages/AuthPage'
import InterviewPage from './pages/InterviewPage'
import DuelPage from './pages/DuelPage'
import LearnPage from './pages/LearnPage'
import MainPage, { type MainSection } from './pages/MainPage'
import ProfilePage from './pages/ProfilePage'

type AuthState =
  | { status: 'checking' }
  | { status: 'signedOut' }
  | { status: 'signedIn'; user: User }

type Screen = 'main' | 'learn' | 'interview' | 'duel' | 'profile'

function App() {
  const [auth, setAuth] = useState<AuthState>(() =>
    loadSession() ? { status: 'checking' } : { status: 'signedOut' },
  )
  const [screen, setScreen] = useState<Screen>('main')
  // Whose profile is open; undefined is the logged-in player's own
  const [profileUserId, setProfileUserId] = useState<string | undefined>(undefined)

  // A stored session may have expired or been revoked, so confirm it with the backend
  useEffect(() => {
    if (auth.status !== 'checking') return
    let cancelled = false

    getMe()
      .then((user) => {
        if (!cancelled) setAuth({ status: 'signedIn', user })
      })
      .catch(() => {
        if (cancelled) return
        // A rejected session is cleared by getMe; if it's still here the backend was just unreachable
        const session = loadSession()
        setAuth(session ? { status: 'signedIn', user: session.user } : { status: 'signedOut' })
      })

    return () => {
      cancelled = true
    }
  }, [auth.status])

  async function handleLogin(values: LoginValues) {
    const response = await login(values.email, values.password)
    startSession(response, values.rememberMe)
    setAuth({ status: 'signedIn', user: response.user })
  }

  async function handleSignup(values: SignupValues) {
    const response = await signup(values)
    startSession(response, false)
    setAuth({ status: 'signedIn', user: response.user })
  }

  function handleLogout() {
    const session = loadSession()
    clearSession()
    setAuth({ status: 'signedOut' })
    setScreen('main')
    // Best effort: the tokens are already gone locally
    if (session) logout(session.refreshToken).catch(() => {})
  }

  function openProfile(userId?: string) {
    setProfileUserId(userId)
    setScreen('profile')
  }

  function handleGoogle() {
    console.info('Google sign-in (not connected yet)')
  }

  function handleSelect(section: MainSection) {
    setScreen(section)
  }

  if (auth.status === 'checking') return null

  if (auth.status === 'signedOut') {
    return <AuthPage onLogin={handleLogin} onSignup={handleSignup} onGoogle={handleGoogle} />
  }

  if (screen === 'duel') {
    return <DuelPage onBack={() => setScreen('main')} />
  }

  if (screen === 'learn') {
    return <LearnPage onBack={() => setScreen('main')} />
  }

  if (screen === 'interview') {
    return <InterviewPage onBack={() => setScreen('main')} />
  }

  if (screen === 'profile') {
    return (
      <ProfilePage
        // A different player gets a fresh page, so state from the previous profile never shows
        key={profileUserId ?? 'me'}
        userId={profileUserId}
        onBack={() => setScreen('main')}
        onOpenProfile={openProfile}
        onStartDuel={() => handleSelect('duel')}
      />
    )
  }

  return <MainPage onSelect={handleSelect} onLogout={handleLogout} onOpenProfile={() => openProfile()} />
}

export default App
