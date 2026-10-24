import { useState, type PointerEvent } from 'react'
import type { FollowTheRequestChallenge, FollowTheRequestReveal, OrderAnswer } from '../types'
import { LockBar, StatusTag, type ChallengeProps } from './shared'

export function FollowTheRequest({
  challenge,
  reveal,
  answer,
  locked,
  submitting,
  onSubmit,
}: ChallengeProps<FollowTheRequestChallenge, FollowTheRequestReveal, OrderAnswer>) {
  const [order, setOrder] = useState<string[]>(answer?.stepIds ?? challenge.steps.map((step) => step.id))
  const [dragging, setDragging] = useState<string | null>(null)
  const [moved, setMoved] = useState(false)
  const shown = answer?.stepIds ?? order
  const textOf = new Map(challenge.steps.map((step) => [step.id, step.text]))

  function move(from: number, to: number) {
    if (to < 0 || to >= order.length || from === to) return
    const next = [...order]
    const [item] = next.splice(from, 1)
    next.splice(to, 0, item)
    setOrder(next)
    setMoved(true)
  }

  // Pointer events instead of HTML5 drag and drop, so dragging works with mouse, touch and pen alike
  function startDrag(event: PointerEvent<HTMLLIElement>, id: string) {
    if (locked || event.button !== 0) return
    const target = event.target as HTMLElement
    if (target.closest('button')) return
    // On touch screens only the grip drags, so the rest of the row still scrolls the page
    if (event.pointerType !== 'mouse' && !target.closest('.flow-step-grip')) return
    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    setDragging(id)
  }

  // Reorders live while dragging, so the list shows where the step will land
  function dragOver(event: PointerEvent<HTMLLIElement>) {
    if (!dragging) return
    const over = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>('[data-step-id]')
    const overId = over?.dataset.stepId
    if (overId && overId !== dragging) move(order.indexOf(dragging), order.indexOf(overId))
  }

  return (
    <div className="duel-challenge">
      <div className={`flow${reveal ? ' has-reveal' : ''}`}>
        <section aria-label="Your order">
          {reveal && <p className="duel-panel-label">Your order</p>}
          <ol className="flow-list">
            {shown.map((id, index) => {
              const correctIndex = reveal ? reveal.correctOrder.indexOf(id) : -1
              const inPlace = reveal ? correctIndex === index : false
              return (
                <li
                  key={id}
                  data-step-id={id}
                  className={[
                    'flow-step',
                    locked ? '' : 'is-draggable',
                    dragging === id ? 'is-dragging' : '',
                    reveal ? (inPlace ? 'is-correct' : 'is-wrong') : '',
                  ].join(' ')}
                  onPointerDown={(event) => startDrag(event, id)}
                  onPointerMove={dragOver}
                  onPointerUp={() => setDragging(null)}
                  onPointerCancel={() => setDragging(null)}
                >
                  <span className="flow-step-index">{index + 1}</span>
                  {!locked && <i className="ti ti-grip-vertical flow-step-grip" aria-hidden="true" />}
                  <span className="flow-step-text">{textOf.get(id)}</span>
                  {reveal && (
                    <StatusTag tone={inPlace ? 'correct' : 'wrong'}>
                      {inPlace ? 'Right place' : `Step ${correctIndex + 1}`}
                    </StatusTag>
                  )}
                  {!locked && (
                    <span className="flow-step-moves">
                      <button
                        type="button"
                        className="duel-icon-button"
                        aria-label="Move step up"
                        disabled={index === 0}
                        onClick={() => move(index, index - 1)}
                      >
                        <i className="ti ti-chevron-up" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        className="duel-icon-button"
                        aria-label="Move step down"
                        disabled={index === shown.length - 1}
                        onClick={() => move(index, index + 1)}
                      >
                        <i className="ti ti-chevron-down" aria-hidden="true" />
                      </button>
                    </span>
                  )}
                </li>
              )
            })}
          </ol>
        </section>

        {reveal && (
          <section aria-label="Correct order">
            <p className="duel-panel-label">Correct order</p>
            <ol className="flow-list">
              {reveal.correctOrder.map((id, index) => (
                <li key={id} className="flow-step is-solution">
                  <span className="flow-step-index">{index + 1}</span>
                  <span className="flow-step-text">{textOf.get(id)}</span>
                </li>
              ))}
            </ol>
          </section>
        )}
      </div>

      {!locked && (
        <LockBar
          hint={
            moved
              ? 'Only the full order counts. Check it once more.'
              : 'Drag the steps, or use the arrows, to put them in order.'
          }
          disabled={false}
          submitting={submitting}
          onLock={() => onSubmit({ stepIds: order })}
        />
      )}
    </div>
  )
}
