import { useEffect, useState } from 'react'

interface TypewriterOptions {
  typeMs?: number
  deleteMs?: number
  holdMs?: number
}

function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

// Types each word, holds it, deletes it, then moves on to the next one in a loop.
// With reduced motion it shows the first word without animating.
export function useTypewriter(words: string[], { typeMs = 90, deleteMs = 45, holdMs = 1800 }: TypewriterOptions = {}) {
  const [reduced] = useState(prefersReducedMotion)
  const [wordIndex, setWordIndex] = useState(0)
  const [length, setLength] = useState(0)
  const [deleting, setDeleting] = useState(false)

  const word = words[wordIndex % words.length]

  useEffect(() => {
    if (reduced) return

    let delay = deleting ? deleteMs : typeMs
    if (!deleting && length === word.length) delay = holdMs

    const timer = window.setTimeout(() => {
      if (!deleting && length === word.length) {
        setDeleting(true)
      } else if (deleting && length === 0) {
        setDeleting(false)
        setWordIndex((index) => (index + 1) % words.length)
      } else {
        setLength((value) => value + (deleting ? -1 : 1))
      }
    }, delay)

    return () => window.clearTimeout(timer)
  }, [reduced, deleting, length, word, words.length, typeMs, deleteMs, holdMs])

  return reduced ? words[0] : word.slice(0, length)
}
