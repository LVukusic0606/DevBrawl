import { useEffect, useState } from 'react'

// Milliseconds left until a server time (UTC ISO string). Both players count down to the same instant.
export function useCountdown(endsAt: string | null) {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (!endsAt) return
    const timer = window.setInterval(() => setNow(Date.now()), 250)
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
