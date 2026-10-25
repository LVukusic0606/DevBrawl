import { useEffect, useState } from 'react'
import { serverNow } from './serverClock'

// Milliseconds left until a server time (UTC ISO string). Both players count down to the same instant,
// measured on the server's clock, so a device whose clock is off still shows the right time.
export function useCountdown(endsAt: string | null) {
  const [now, setNow] = useState(() => serverNow())

  useEffect(() => {
    if (!endsAt) return
    const timer = window.setInterval(() => setNow(serverNow()), 250)
    return () => window.clearInterval(timer)
  }, [endsAt])

  if (!endsAt) return null
  return Math.max(0, new Date(endsAt).getTime() - now)
}

// Seconds since a moment, updated every second
export function useElapsed(since: number) {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [])

  return Math.max(0, Math.floor((now - since) / 1000))
}

export function formatClock(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}
