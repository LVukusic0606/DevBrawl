import { useState } from 'react'
import AuthPage, { type LoginValues, type SignupValues } from './pages/AuthPage'
import MainPage, { type MainSection } from './pages/MainPage'
import LearnPage from './pages/LearnPage'

type Screen = 'auth' | 'main' | 'learn'

function App() {
  const [screen, setScreen] = useState<Screen>('auth')

  function handleLogin(values: LoginValues) {
    console.info('Login submitted (backend not connected yet)', values.email)
    setScreen('main')
  }

  function handleSignup(values: SignupValues) {
    console.info('Signup submitted (backend not connected yet)', values.email)
    setScreen('main')
  }

  function handleGoogle() {
    console.info('Google sign-in (not connected yet)')
    setScreen('main')
  }

  function handleSelect(section: MainSection) {
    if (section === 'learn') {
      setScreen('learn')
      return
    }
    console.info('Section selected (not connected yet)', section)
  }

  if (screen === 'main') {
    return <MainPage onSelect={handleSelect} />
  }

  if (screen === 'learn') {
    return <LearnPage onBack={() => setScreen('main')} />
  }

  return (
    <AuthPage onLogin={handleLogin} onSignup={handleSignup} onGoogle={handleGoogle} />
  )
}

export default App
