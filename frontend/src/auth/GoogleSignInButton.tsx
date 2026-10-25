import { useEffect, useRef, useState, type ReactNode } from 'react'
import { getGoogleConfig } from '../api/auth'

// The parts of Google Identity Services (https://accounts.google.com/gsi/client) used here
interface GoogleIdentityServices {
  initialize(config: { client_id: string; callback: (response: { credential: string }) => void; ux_mode?: 'popup' }): void
  renderButton(
    parent: HTMLElement,
    options: { theme: string; size: string; text: string; shape: string; width: number; logo_alignment: string; locale: string },
  ): void
}

declare global {
  interface Window {
    google?: { accounts: { id: GoogleIdentityServices } }
  }
}

let scriptLoading: Promise<void> | null = null

function loadGoogleScript(): Promise<void> {
  scriptLoading ??= new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => {
      scriptLoading = null
      reject(new Error("Couldn't load Google sign-in"))
    }
    document.head.appendChild(script)
  })
  return scriptLoading
}

interface GoogleSignInButtonProps {
  // Called with Google's ID token after the user picks an account
  onCredential: (idToken: string) => void
  // Shown above the button, e.g. an "Or log in with" divider; hidden with the button when Google isn't set up
  before?: ReactNode
}

// Google's own sign-in button (Google requires it for ID-token sign-in). Renders nothing when the server
// has no Google client ID or the Google script can't load.
export function GoogleSignInButton({ onCredential, before }: GoogleSignInButtonProps) {
  const container = useRef<HTMLDivElement>(null)
  const callback = useRef(onCredential)
  const [available, setAvailable] = useState(true)

  useEffect(() => {
    callback.current = onCredential
  })

  useEffect(() => {
    let cancelled = false

    getGoogleConfig()
      .then(async ({ clientId }) => {
        if (!clientId) throw new Error('Google sign-in is not configured')
        await loadGoogleScript()
        const box = container.current
        if (cancelled || !box || !window.google) return

        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: (response) => callback.current(response.credential),
          ux_mode: 'popup',
        })
        window.google.accounts.id.renderButton(box, {
          // The outline theme is Google's light variant with a 1px frame, which sits calmer on the dark form than the solid black one
          theme: 'outline',
          // Medium is the smallest size Google draws at a normal weight; the large G looked too big for the button
          size: 'medium',
          text: 'continue_with',
          shape: 'rectangular',
          // Google accepts 200 to 400 pixels
          width: Math.max(200, Math.min(400, box.offsetWidth)),
          logo_alignment: 'center',
          // Otherwise Google uses the browser's language; the rest of the UI is English
          locale: 'en',
        })
      })
      .catch(() => {
        if (!cancelled) setAvailable(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  if (!available) return null

  return (
    <>
      {before}
      <div ref={container} className="auth-google-slot" />
    </>
  )
}
