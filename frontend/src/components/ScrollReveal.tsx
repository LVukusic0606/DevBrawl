import { useEffect, useRef, useState, type ReactNode } from 'react'
import './ScrollReveal.css'

interface ScrollRevealProps {
  children: ReactNode
  // Stay hidden when the block is already on screen at load; reveal only after the user scrolls.
  // A page too short to scroll reveals straight away, so the block is never left out of sight.
  revealOnScroll?: boolean
}

// Fades a block in and lifts it slightly the first time it scrolls into view
function ScrollReveal({ children, revealOnScroll = false }: ScrollRevealProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const element = ref.current
    if (visible || !element) return

    // Reveal once the top edge is in the lower part of the screen or already above it, or once the whole
    // block is on screen. The second case covers the last block of a page, which can never scroll that high.
    function check(scrolled: boolean) {
      if (!element) return
      const isShortPage = document.documentElement.scrollHeight <= window.innerHeight
      if (revealOnScroll && !scrolled && !isShortPage) return
      const { top, bottom } = element.getBoundingClientRect()
      if (top < window.innerHeight * 0.9 || bottom <= window.innerHeight) setVisible(true)
    }

    // Checked once after mount, then on every scroll and resize until the block is shown
    const onScroll = () => check(true)
    const onResize = () => check(false)
    const frame = requestAnimationFrame(() => check(false))
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onResize)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onResize)
    }
  }, [visible, revealOnScroll])

  return (
    <div ref={ref} className={`scroll-reveal${visible ? ' is-visible' : ''}`}>
      {children}
    </div>
  )
}

export default ScrollReveal
