import type { Profile } from '../api/profiles'
import { findAvatar } from '../profile/avatars'
import { TIER_LABELS } from '../profile/format'
import { findTag } from '../profile/tags'
import {
  CARD_WIDTH,
  FONT_CODE,
  FONT_TEXT,
  createCard,
  drawAvatar,
  drawFrame,
  drawPill,
  drawStat,
  ensureFonts,
  fitText,
  roundRect,
  tokens,
} from './canvas'

const percent = (part: number, whole: number) => (whole > 0 ? `${Math.round((part / whole) * 100)}%` : '–')
const signed = (n: number) => (n > 0 ? `+${n}` : `${n}`)

// Profile card: who the player is, their overall rating and where they're strongest
export async function drawProfileCard(profile: Profile): Promise<HTMLCanvasElement> {
  await ensureFonts()
  const t = tokens()
  const { canvas, ctx } = createCard()
  await drawFrame(ctx, t, 'Player card')

  const { user, progress, overall, duels, accuracy } = profile
  await drawAvatar(ctx, t, findAvatar(user.avatarId)?.url, user.nickname, 56, 120, 150)

  ctx.fillStyle = t.text
  fitText(ctx, user.nickname, 236, 178, 520, 56, FONT_TEXT)
  const tag = findTag(user.tag)
  if (tag) drawPill(ctx, t, tag.label, 236, 196)
  ctx.font = `20px ${FONT_TEXT}`
  ctx.fillStyle = t.muted
  ctx.fillText(`Level ${progress.level} · ${progress.totalXp} XP`, 236, tag ? 262 : 222)

  // The headline number: overall rating, in the duel accent like on the profile
  ctx.textAlign = 'right'
  ctx.font = `18px ${FONT_TEXT}`
  ctx.fillStyle = t.muted
  ctx.fillText('OVERALL RATING', CARD_WIDTH - 56, 140)
  ctx.font = `700 88px ${FONT_CODE}`
  ctx.fillStyle = t.duel
  ctx.fillText(String(overall.rating), CARD_WIDTH - 56, 228)
  ctx.font = `20px ${FONT_TEXT}`
  ctx.fillStyle = t.text
  ctx.fillText(TIER_LABELS[overall.tier], CARD_WIDTH - 56, 260)
  ctx.textAlign = 'left'

  // Categories, best first: two columns of three
  const sorted = [...profile.ratings].sort((a, b) => b.rating - a.rating)
  sorted.forEach((rating, index) => {
    const column = index < 3 ? 0 : 1
    const x = 56 + column * 330
    const y = 330 + (index % 3) * 52
    roundRect(ctx, x, y - 30, 310, 42, 8)
    ctx.fillStyle = index === 0 ? t.duelSoft : t.surface
    ctx.fill()
    ctx.font = `18px ${FONT_TEXT}`
    ctx.fillStyle = t.text
    fitText(ctx, rating.name, x + 14, y - 3, 190, 18, FONT_TEXT)
    ctx.textAlign = 'right'
    ctx.font = `700 20px ${FONT_CODE}`
    ctx.fillStyle = index === 0 ? t.duel : t.text
    ctx.fillText(String(rating.rating), x + 296, y - 2)
    ctx.textAlign = 'left'
  })

  drawStat(ctx, t, 'Duels', String(duels.played), 56, 474)
  drawStat(ctx, t, 'Win rate', percent(duels.wins, duels.played), 236, 474)
  drawStat(ctx, t, 'Accuracy', percent(accuracy.overall.correct, accuracy.overall.total), 436, 474)

  return canvas
}

export interface DuelCardData {
  result: 'won' | 'lost' | 'draw'
  you: { nickname: string; avatarId: number | null | undefined }
  opponent: { nickname: string; avatarId: number | null | undefined }
  yourScore: number
  opponentScore: number
  correct: number
  rounds: number
  xpGained: number
  durationSeconds: number | null
  ratingChanges: { categoryName: string; delta: number }[]
}

const HEADLINES = { won: 'VICTORY', lost: 'DEFEAT', draw: 'DRAW' } as const

// Duel card: who you played, the score, and what it did to your ratings
export async function drawDuelCard(duel: DuelCardData): Promise<HTMLCanvasElement> {
  await ensureFonts()
  const t = tokens()
  const { canvas, ctx } = createCard()
  await drawFrame(ctx, t, '1v1 duel')

  const resultColor = duel.result === 'won' ? t.success : duel.result === 'lost' ? t.danger : t.muted
  ctx.font = `700 64px ${FONT_CODE}`
  ctx.fillStyle = resultColor
  ctx.fillText(HEADLINES[duel.result], 56, 176)

  const verb = duel.result === 'won' ? 'beat' : duel.result === 'lost' ? 'lost to' : 'drew with'
  ctx.fillStyle = t.text
  fitText(ctx, `${duel.you.nickname} ${verb} ${duel.opponent.nickname}`, 56, 222, 640, 28, FONT_TEXT)

  // Face-off: both players with the score between them
  const avatarY = 260
  await drawAvatar(ctx, t, findAvatar(duel.you.avatarId ?? null)?.url, duel.you.nickname, 56, avatarY, 112)
  await drawAvatar(ctx, t, findAvatar(duel.opponent.avatarId ?? null)?.url, duel.opponent.nickname, 468, avatarY, 112)
  ctx.textAlign = 'center'
  ctx.font = `700 64px ${FONT_CODE}`
  ctx.fillStyle = t.text
  ctx.fillText(`${duel.yourScore}–${duel.opponentScore}`, 318, avatarY + 78)
  ctx.font = `16px ${FONT_TEXT}`
  ctx.fillStyle = t.muted
  fitText(ctx, duel.you.nickname, 112, avatarY + 140, 150, 16, FONT_TEXT)
  fitText(ctx, duel.opponent.nickname, 524, avatarY + 140, 150, 16, FONT_TEXT)
  ctx.textAlign = 'left'

  drawStat(ctx, t, 'Correct', `${duel.correct}/${duel.rounds}`, 56, 466)
  drawStat(ctx, t, 'XP earned', `+${duel.xpGained}`, 236, 466, t.accent)
  if (duel.durationSeconds !== null) {
    const m = Math.floor(duel.durationSeconds / 60)
    const s = String(duel.durationSeconds % 60).padStart(2, '0')
    drawStat(ctx, t, 'Time', `${m}:${s}`, 436, 466)
  }

  // Rating changes by category: each category moves on its own
  const changes = duel.ratingChanges.filter((c) => c.delta !== 0).slice(0, 4)
  const listX = 680
  ctx.font = `20px ${FONT_TEXT}`
  ctx.fillStyle = t.muted
  ctx.fillText('RATING CHANGES', listX, 150)
  if (changes.length === 0) {
    ctx.font = `26px ${FONT_TEXT}`
    ctx.fillStyle = t.text
    ctx.fillText('No rating changes', listX, 200)
  }
  changes.forEach((change, index) => {
    const y = 202 + index * 54
    ctx.fillStyle = t.text
    fitText(ctx, change.categoryName, listX, y, 330, 28, FONT_TEXT)
    ctx.textAlign = 'right'
    ctx.font = `700 34px ${FONT_CODE}`
    ctx.fillStyle = change.delta > 0 ? t.success : t.danger
    ctx.fillText(signed(change.delta), CARD_WIDTH - 56, y)
    ctx.textAlign = 'left'
  })

  return canvas
}
