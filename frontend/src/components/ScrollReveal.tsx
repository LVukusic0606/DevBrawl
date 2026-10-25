import { useEffect, useRef, useState, type ReactNode } from 'react'
import './ScrollReveal.css'

interface ScrollRevealProps {
  children: ReactNode
}

// Fades a block in and lifts it slightly the first time it scrolls into view
function ScrollReveal({ children }: ScrollRevealProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const element = ref.current
    if (visible || !element) return

    // Reveal once the top edge is in the lower part of the screen or already above it, or once the whole
    // block is on screen. The second case covers the last block of a page, which can never scroll that high.
    function check() {
      if (!element) return
      const { top, bottom } = element.getBoundingClientRect()
      if (top < window.innerHeight * 0.9 || bottom <= window.innerHeight) setVisible(true)
    }

    // Checked once after mount, then on every scroll and resize until the block is shown
    const frame = requestAnimationFrame(check)
    window.addEventListener('scroll', check, { passive: true })
    window.addEventListener('resize', check)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('scroll', check)
      window.removeEventListener('resize', check)
    }
  }, [visible])

  return (
    <div ref={ref} className={`scroll-reveal${visible ? ' is-visible' : ''}`}>
      {children}
    </div>
  )
}

export default ScrollReveal
