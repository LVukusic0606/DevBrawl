import mascotUrl from '../assets/mascot.webp'

// Share cards are drawn on a canvas in the browser: 1200 × 630 is the size LinkedIn and Facebook show best
export const CARD_WIDTH = 1200
export const CARD_HEIGHT = 630

// The app's design tokens (index.css), read at draw time so cards always match the app
export function tokens() {
  const style = getComputedStyle(document.documentElement)
  const read = (name: string) => style.getPropertyValue(name).trim()
  return {
    bg: read('--color-bg'),
    surface: read('--color-surface'),
    surfaceRaised: read('--color-surface-raised'),
    border: read('--color-border'),
    borderStrong: read('--color-border-strong'),
    grid: read('--color-grid'),
    text: read('--color-text'),
    muted: read('--color-text-muted'),
    accent: read('--color-accent'),
    duel: read('--color-duel'),
    duelSoft: read('--color-duel-soft'),
    success: read('--color-success'),
    danger: read('--color-danger'),
    field: read('--color-field'),
  }
}

export type Tokens = ReturnType<typeof tokens>

export const FONT_TEXT = '"Share Tech Mono", monospace'
export const FONT_CODE = '"Martian Mono", monospace'

// The fonts come from Google Fonts; a canvas only uses them once they're loaded
export async function ensureFonts() {
  await Promise.all([document.fonts.load(`48px ${FONT_TEXT}`), document.fonts.load(`700 48px ${FONT_CODE}`)])
}

export function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error(`Couldn't load ${url}`))
    image.src = url
  })
}

export function createCard() {
  const canvas = document.createElement('canvas')
  canvas.width = CARD_WIDTH
  canvas.height = CARD_HEIGHT
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas is not supported')
  return { canvas, ctx }
}

export function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.roundRect(x, y, w, h, r)
}

// The shared frame: the app's grid background, a window border, the logo and the mascot
export async function drawFrame(ctx: CanvasRenderingContext2D, t: Tokens, label: string) {
  ctx.fillStyle = t.bg
  ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT)

  ctx.strokeStyle = t.grid
  ctx.lineWidth = 1
  for (let x = 0.5; x < CARD_WIDTH; x += 36) {
    ctx.beginPath()
    ctx.moveTo(x, 0)
    ctx.lineTo(x, CARD_HEIGHT)
    ctx.stroke()
  }
  for (let y = 0.5; y < CARD_HEIGHT; y += 36) {
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(CARD_WIDTH, y)
    ctx.stroke()
  }

  roundRect(ctx, 24.5, 24.5, CARD_WIDTH - 49, CARD_HEIGHT - 49, 16)
  ctx.strokeStyle = t.borderStrong
  ctx.stroke()

  ctx.textBaseline = 'alphabetic'
  ctx.textAlign = 'left'
  ctx.font = `28px ${FONT_TEXT}`
  ctx.fillStyle = t.accent
  ctx.fillText('>', 56, 80)
  ctx.fillStyle = t.text
  ctx.fillText('DevBrawl', 80, 80)

  ctx.textAlign = 'right'
  ctx.font = `20px ${FONT_TEXT}`
  ctx.fillStyle = t.muted
  ctx.fillText(label, CARD_WIDTH - 56, 78)

  // The mascot perches in the bottom-right corner, as on the app's screens
  try {
    const mascot = await loadImage(mascotUrl)
    const height = 230
    const width = (mascot.width / mascot.height) * height
    ctx.drawImage(mascot, CARD_WIDTH - width - 40, CARD_HEIGHT - height - 26, width, height)
  } catch {
    // The card still works without the mascot
  }

  ctx.textAlign = 'left'
  ctx.font = `18px ${FONT_TEXT}`
  ctx.fillStyle = t.muted
  ctx.fillText('Learn it. Prove it.', 56, CARD_HEIGHT - 52)
}

// Draws text, shrinking the font until it fits maxWidth
export function fitText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  size: number,
  family: string,
  weight = '',
) {
  let current = size
  ctx.font = `${weight} ${current}px ${family}`.trim()
  while (ctx.measureText(text).width > maxWidth && current > 14) {
    current -= 2
    ctx.font = `${weight} ${current}px ${family}`.trim()
  }
  ctx.fillText(text, x, y)
}

// A square avatar tile: the picture, or the first letter of the nickname
export async function drawAvatar(
  ctx: CanvasRenderingContext2D,
  t: Tokens,
  url: string | null | undefined,
  nickname: string,
  x: number,
  y: number,
  size: number,
) {
  ctx.save()
  roundRect(ctx, x, y, size, size, 16)
  ctx.fillStyle = t.surfaceRaised
  ctx.fill()
  ctx.clip()
  let drawn = false
  if (url) {
    try {
      ctx.drawImage(await loadImage(url), x, y, size, size)
      drawn = true
    } catch {
      // Falls back to the letter
    }
  }
  if (!drawn) {
    ctx.fillStyle = t.text
    ctx.font = `700 ${Math.round(size * 0.45)}px ${FONT_CODE}`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(nickname.charAt(0).toUpperCase(), x + size / 2, y + size / 2 + 2)
    ctx.textAlign = 'left'
    ctx.textBaseline = 'alphabetic'
  }
  ctx.restore()

  roundRect(ctx, x + 0.5, y + 0.5, size - 1, size - 1, 16)
  ctx.strokeStyle = t.borderStrong
  ctx.lineWidth = 1
  ctx.stroke()
}

// A small rounded label, e.g. the player's tag
export function drawPill(ctx: CanvasRenderingContext2D, t: Tokens, text: string, x: number, y: number) {
  ctx.font = `18px ${FONT_TEXT}`
  const width = ctx.measureText(text).width + 28
  roundRect(ctx, x, y, width, 34, 17)
  ctx.fillStyle = t.duelSoft
  ctx.fill()
  ctx.fillStyle = t.text
  ctx.textBaseline = 'middle'
  ctx.fillText(text, x + 14, y + 18)
  ctx.textBaseline = 'alphabetic'
  return width
}

// A label above a big value, as in the app's stat tiles
export function drawStat(
  ctx: CanvasRenderingContext2D,
  t: Tokens,
  label: string,
  value: string,
  x: number,
  y: number,
  color?: string,
) {
  ctx.textAlign = 'left'
  ctx.font = `18px ${FONT_TEXT}`
  ctx.fillStyle = t.muted
  ctx.fillText(label, x, y)
  ctx.font = `700 40px ${FONT_CODE}`
  ctx.fillStyle = color ?? t.text
  ctx.fillText(value, x, y + 48)
}

export function toBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Couldn't create the image"))), 'image/png'),
  )
}
