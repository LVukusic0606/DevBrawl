import { useEffect, useRef, useState, type FormEvent } from 'react'
import { ApiError } from '../api/client'
import { activatePremium, getPremium, sendContactForm, type ContactForm, type Premium } from '../api/store'
import ScrollReveal from '../components/ScrollReveal'
import './PremiumPage.css'

interface PremiumPageProps {
  onBack: () => void
  onOpenSeason: () => void
}

const price = new Intl.NumberFormat('en', { style: 'currency', currency: 'EUR' })
const date = new Intl.DateTimeFormat('en', { day: 'numeric', month: 'long', year: 'numeric' })

// Plans, the (demo) checkout, and the contact form for schools and universities
function PremiumPage({ onBack, onOpenSeason }: PremiumPageProps) {
  const [premium, setPremium] = useState<Premium | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getPremium()
      .then(setPremium)
      .catch((e: unknown) => setError(e instanceof ApiError ? e.message : "Couldn't load your plan."))
  }, [])

  return (
    <main className="premium">
      <header className="premium-header">
        <button type="button" className="premium-button" onClick={onBack}>
          <i className="ti ti-arrow-left" aria-hidden="true" />
          Back
        </button>
        <span className="premium-logo">DevBrawl</span>
      </header>

      <div className="premium-content">
        {/* Title on the left, the plan card on the right, as on the season pass */}
        <section className="premium-hero" aria-labelledby="premium-title">
          <div className="premium-intro">
            <h1 id="premium-title" className="premium-title">
              Premium
            </h1>
            <p className="premium-lead">Learning, duels and leaderboards are free for everyone. Premium adds more.</p>
          </div>
          {premium && <PlanCard premium={premium} />}
        </section>

        {error && <p className="premium-error">{error}</p>}
        {!premium && !error && <p className="premium-muted">Loading your plan…</p>}
        {premium && <Plans premium={premium} onChanged={setPremium} onOpenSeason={onOpenSeason} />}

        <SchoolsForm />
      </div>
    </main>
  )
}

// The current plan, with this month's AI interviews as a meter, the same layout as the profile's level card
function PlanCard({ premium }: { premium: Premium }) {
  const { used, limit } = premium.interviews
  const share = limit > 0 ? Math.min(used / limit, 1) * 100 : 0

  return (
    <div className="premium-plan">
      <span className="premium-plan-label">Your plan</span>
      <span className="premium-plan-value">
        {premium.isPremium && <i className="ti ti-crown" aria-hidden="true" />}
        {premium.isPremium ? 'Premium' : 'Free'}
      </span>
      <div className="premium-meter">
        <div className="premium-meter-labels">
          <span>AI interviews this month</span>
          <span>
            <strong>{used}</strong> of {limit} used
          </span>
        </div>
        <div
          className="premium-bar"
          role="progressbar"
          aria-label="AI interviews used this month"
          aria-valuemin={0}
          aria-valuemax={limit}
          aria-valuenow={used}
        >
          <span className="premium-bar-fill" style={{ width: `${share}%` }} />
        </div>
      </div>
      <p className="premium-plan-note">
        {premium.isPremium ? (
          <>
            Premium is active until <strong>{date.format(new Date(premium.premiumUntil!))}</strong>.
          </>
        ) : (
          "You're on the free plan."
        )}
      </p>
    </div>
  )
}

function Plans({
  premium,
  onChanged,
  onOpenSeason,
}: {
  premium: Premium
  onChanged: (premium: Premium) => void
  onOpenSeason: () => void
}) {
  const checkout = useRef<HTMLDialogElement>(null)
  const [paying, setPaying] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const monthly = price.format(premium.monthlyPriceEur)

  async function confirm() {
    setPaying(true)
    setError(null)
    try {
      onChanged(await activatePremium())
      checkout.current?.close()
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Something went wrong. Try again.')
    } finally {
      setPaying(false)
    }
  }

  const rows: { label: string; free: string; premium: string }[] = [
    { label: 'Lessons, quizzes and duels', free: 'Unlimited', premium: 'Unlimited' },
    { label: 'Ratings, leaderboard and duel review', free: 'Included', premium: 'Included' },
    {
      label: 'AI interviews',
      free: `${premium.freeInterviewsPerMonth} per month`,
      premium: `${premium.premiumInterviewsPerMonth} per month`,
    },
    { label: 'Season pass rewards', free: 'Free track', premium: 'Free and premium track' },
  ]

  return (
    <ScrollReveal>
      <section className="premium-section" aria-labelledby="plans-title">
        <div className="premium-section-head">
          <h2 id="plans-title" className="premium-section-title">
            Compare plans
          </h2>
        </div>

        <div className="premium-panel">
          <table className="premium-table">
            <caption className="premium-sr-only">Free and Premium plans</caption>
            <thead>
              <tr>
                <th scope="col">
                  <span className="premium-sr-only">Feature</span>
                </th>
                <th scope="col">Free</th>
                <th scope="col" className="is-premium">
                  Premium
                  <span className="premium-price">{monthly}/month</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.label}>
                  <th scope="row">{row.label}</th>
                  <td>{row.free}</td>
                  <td className="is-premium">{row.premium}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="premium-actions">
          <button
            type="button"
            className="premium-primary"
            onClick={() => {
              setError(null)
              checkout.current?.showModal()
            }}
          >
            {premium.isPremium ? 'Extend by a month' : `Get Premium · ${monthly}/month`}
          </button>
          <button type="button" className="premium-button" onClick={onOpenSeason}>
            <i className="ti ti-ticket" aria-hidden="true" />
            See the season pass
          </button>
        </div>

        {/* Demo checkout: there's no payment provider yet */}
        <dialog
          ref={checkout}
          className="premium-dialog"
          aria-labelledby="checkout-title"
          onClick={(event) => {
            if (event.target === event.currentTarget) checkout.current?.close()
          }}
        >
          <h2 id="checkout-title" className="premium-dialog-title">
            Premium · {monthly}/month
          </h2>
          <p className="premium-demo">
            <i className="ti ti-info-circle" aria-hidden="true" />
            Demo checkout: no payment is taken. Confirming gives you one month of Premium.
          </p>
          {error && <p className="premium-error">{error}</p>}
          <div className="premium-actions">
            <button type="button" className="premium-primary" disabled={paying} onClick={confirm}>
              {paying ? 'Activating…' : 'Confirm'}
            </button>
            <button type="button" className="premium-button" disabled={paying} onClick={() => checkout.current?.close()}>
              Cancel
            </button>
          </div>
        </dialog>
      </section>
    </ScrollReveal>
  )
}

const EMPTY_FORM: ContactForm = { name: '', institution: '', email: '', message: '' }

function SchoolsForm() {
  const [form, setForm] = useState<ContactForm>(EMPTY_FORM)
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | { error: string }>('idle')

  async function submit(event: FormEvent) {
    event.preventDefault()
    setStatus('sending')
    try {
      await sendContactForm(form)
      setForm(EMPTY_FORM)
      setStatus('sent')
    } catch (e) {
      setStatus({ error: e instanceof ApiError ? e.message : 'Something went wrong. Try again.' })
    }
  }

  const field = (name: keyof ContactForm) => ({
    value: form[name],
    onChange: (e: { target: { value: string } }) => setForm((f) => ({ ...f, [name]: e.target.value })),
  })

  return (
    <ScrollReveal>
      <section className="premium-section" aria-labelledby="schools-title">
        <div className="premium-section-head">
          <h2 id="schools-title" className="premium-section-title">
            For schools and universities
          </h2>
          <p className="premium-section-note">
            Want DevBrawl for your class? Tell us about it and we'll set something up together.
          </p>
        </div>

        <form className="premium-panel premium-form" onSubmit={submit}>
          <label className="premium-field">
            <span>Your name</span>
            <input className="premium-input" required minLength={2} maxLength={100} autoComplete="name" {...field('name')} />
          </label>
          <label className="premium-field">
            <span>School or university</span>
            <input className="premium-input" required minLength={2} maxLength={200} autoComplete="organization" {...field('institution')} />
          </label>
          <label className="premium-field">
            <span>Email</span>
            <input className="premium-input" type="email" required maxLength={254} autoComplete="email" {...field('email')} />
          </label>
          <label className="premium-field is-wide">
            <span>Message</span>
            <textarea className="premium-input is-textarea" required minLength={10} maxLength={2000} rows={4} {...field('message')} />
          </label>
          <div className="premium-form-footer">
            <button type="submit" className="premium-button" disabled={status === 'sending'}>
              {status === 'sending' ? 'Sending…' : 'Send'}
            </button>
            <p className={`premium-form-status${typeof status === 'object' ? ' is-error' : ''}`} role="status">
              {status === 'sent' && (
                <>
                  <i className="ti ti-check" aria-hidden="true" /> Thanks! We'll get back to you by email.
                </>
              )}
              {typeof status === 'object' && status.error}
            </p>
          </div>
        </form>
      </section>
    </ScrollReveal>
  )
}

export default PremiumPage
