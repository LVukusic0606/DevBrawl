import { useCountdown } from '../useCountdown'
import type { DuelInvite } from '../types'

// Waiting for a friend to accept a friendly duel
export function Inviting({ invite, onCancel }: { invite: DuelInvite; onCancel: () => void }) {
  const seconds = Math.ceil((useCountdown(invite.expiresAt) ?? 0) / 1000)

  return (
    <section className="duel-center is-queue" aria-live="polite">
      <div className="duel-inviting-text">
        <p className="duel-eyebrow">Friendly duel</p>
        <h1 className="duel-hero-title">Waiting for {invite.to.nickname}.</h1>
        <p className="duel-lead">Your ELO and XP stay the same in a friendly duel.</p>
      </div>
      <p className="duel-big-number" aria-label={`${seconds} seconds left to accept`}>
        {seconds}
      </p>
      <button type="button" className="duel-secondary" onClick={onCancel}>
        <i className="ti ti-x" aria-hidden="true" />
        Cancel invite
      </button>
    </section>
  )
}
