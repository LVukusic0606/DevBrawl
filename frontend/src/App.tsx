import AuthPage, { type LoginValues, type SignupValues } from './pages/AuthPage'

function App() {
  function handleLogin(values: LoginValues) {
    console.info('Login submitted (backend not connected yet)', values.email)
  }

  function handleSignup(values: SignupValues) {
    console.info('Signup submitted (backend not connected yet)', values.email)
  }

  function handleGoogle() {
    console.info('Google sign-in (not connected yet)')
  }

  return (
    <AuthPage onLogin={handleLogin} onSignup={handleSignup} onGoogle={handleGoogle} />
  )
}

export default App
