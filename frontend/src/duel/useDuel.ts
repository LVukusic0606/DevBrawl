import { HubConnection, HubConnectionBuilder, LogLevel } from '@microsoft/signalr'
import { useCallback, useEffect, useReducer, useRef, useState } from 'react'
import { getFreshAccessToken } from '../api/auth'
import { syncServerClock } from './serverClock'
import type {
  Answer,
  DuelAbortedEvent,
  DuelEndedEvent,
  DuelStateEvent,
  MatchFoundEvent,
  Player,
  RoundAnswerEvent,
  RoundEndedEvent,
  RoundResult,
  RoundStartedEvent,
  SubmitResult,
} from './types'

export interface RoundOutcome {
  result: RoundResult
  youCorrect: boolean
  opponentCorrect: boolean
}

export interface Match {
  duelId: string
  you: Player
  opponent: Player
  yourScore: number
  opponentScore: number
  opponentConnected: boolean
  // Outcomes of the rounds this tab saw end, by round number
  outcomes: Record<number, RoundOutcome>
}

export interface RoundState {
  round: RoundStartedEvent
  // The answer this tab sent. After a page refresh it's unknown, so youAnswered can be true without it.
  answer: Answer | null
  youAnswered: boolean
  opponentAnswered: boolean
  submitting: boolean
  error: string | null
}

export type DuelView =
  | { phase: 'connecting' }
  | { phase: 'connectionFailed' }
  | { phase: 'lobby'; error: string | null }
  | { phase: 'queue'; since: number }
  | { phase: 'countdown'; match: Match; startsAt: string }
  | { phase: 'round'; match: Match; current: RoundState }
  | {
      phase: 'reveal'
      match: Match
      // The round that just ended; null only if it couldn't be recovered after a refresh
      current: RoundState | null
      ended: RoundEndedEvent
      nextRoundAt: string | null
    }
  | { phase: 'results'; match: Match | null; ended: DuelEndedEvent }
  | { phase: 'aborted'; reason: string }

type Action =
  | { type: 'connected' }
  | { type: 'connectionFailed' }
  | { type: 'connecting' }
  | { type: 'queueJoined' }
  | { type: 'queueLeft' }
  | { type: 'queueError'; message: string }
  | { type: 'matchFound'; event: MatchFoundEvent }
  | { type: 'roundStarted'; event: RoundStartedEvent }
  | { type: 'answerAccepted'; event: RoundAnswerEvent }
  | { type: 'opponentAnswered'; event: RoundAnswerEvent }
  | { type: 'roundEnded'; event: RoundEndedEvent }
  | { type: 'duelEnded'; event: DuelEndedEvent }
  | { type: 'duelState'; event: DuelStateEvent }
  | { type: 'opponentConnection'; duelId: string; connected: boolean }
  | { type: 'duelAborted'; event: DuelAbortedEvent }
  | { type: 'submitStarted'; answer: Answer }
  | { type: 'submitFinished'; result: SubmitResult }
  | { type: 'backToLobby' }

function matchOf(view: DuelView): Match | null {
  return 'match' in view ? view.match : null
}

// Events for another duel (an old one in another tab, say) must not touch this screen
function isOtherDuel(view: DuelView, duelId: string) {
  const match = matchOf(view)
  return match !== null && match.duelId !== duelId
}

function newRound(round: RoundStartedEvent): RoundState {
  return { round, answer: null, youAnswered: false, opponentAnswered: false, submitting: false, error: null }
}

function reducer(view: DuelView, action: Action): DuelView {
  switch (action.type) {
    case 'connecting':
      return { phase: 'connecting' }

    case 'connected':
      // DuelState may already have rebuilt a running duel before start() resolved
      return view.phase === 'connecting' ? { phase: 'lobby', error: null } : view

    case 'connectionFailed':
      return view.phase === 'results' ? view : { phase: 'connectionFailed' }

    case 'queueJoined':
      return { phase: 'queue', since: Date.now() }

    case 'queueLeft':
      return view.phase === 'queue' ? { phase: 'lobby', error: null } : view

    case 'queueError':
      return { phase: 'lobby', error: action.message }

    case 'matchFound': {
      const { event } = action
      return {
        phase: 'countdown',
        startsAt: event.startsAt,
        match: {
          duelId: event.duelId,
          you: event.you,
          opponent: event.opponent,
          yourScore: 0,
          opponentScore: 0,
          opponentConnected: true,
          outcomes: {},
        },
      }
    }

    case 'roundStarted': {
      const match = matchOf(view)
      if (!match || match.duelId !== action.event.duelId) return view
      return { phase: 'round', match, current: newRound(action.event) }
    }

    case 'answerAccepted':
    case 'opponentAnswered': {
      if (view.phase !== 'round' || view.current.round.roundNumber !== action.event.roundNumber) return view
      if (isOtherDuel(view, action.event.duelId)) return view
      const key = action.type === 'answerAccepted' ? 'youAnswered' : 'opponentAnswered'
      return { ...view, current: { ...view.current, [key]: true } }
    }

    case 'roundEnded': {
      const { event } = action
      const match = matchOf(view)
      if (!match || match.duelId !== event.duelId) return view
      const current = view.phase === 'round' && view.current.round.roundNumber === event.roundNumber ? view.current : null
      return {
        phase: 'reveal',
        match: {
          ...match,
          yourScore: event.yourScore,
          opponentScore: event.opponentScore,
          outcomes: {
            ...match.outcomes,
            [event.roundNumber]: {
              result: event.result,
              youCorrect: event.youCorrect,
              opponentCorrect: event.opponentCorrect,
            },
          },
        },
        current,
        ended: event,
        nextRoundAt: null,
      }
    }

    case 'duelEnded':
      if (isOtherDuel(view, action.event.duelId)) return view
      return { phase: 'results', match: matchOf(view), ended: action.event }

    case 'duelState': {
      const { event } = action
      const previous = matchOf(view)?.duelId === event.duelId ? matchOf(view) : null
      const outcomes = { ...previous?.outcomes }
      if (event.lastRoundEnded) {
        const ended = event.lastRoundEnded
        outcomes[ended.roundNumber] = {
          result: ended.result,
          youCorrect: ended.youCorrect,
          opponentCorrect: ended.opponentCorrect,
        }
      }
      const match: Match = {
        duelId: event.duelId,
        you: event.you,
        opponent: event.opponent,
        yourScore: event.yourScore,
        opponentScore: event.opponentScore,
        opponentConnected: previous?.opponentConnected ?? true,
        outcomes,
      }
      // Keep this tab's own answer when the server only repeats what we already know
      const known = view.phase === 'round' || view.phase === 'reveal' ? view.current : null

      if (event.phase === 'countdown' || !event.currentRound) {
        return { phase: 'countdown', match, startsAt: event.phaseEndsAt }
      }

      const sameRound = known?.round.roundNumber === event.currentRound.roundNumber
      const current: RoundState = {
        ...(sameRound && known ? known : newRound(event.currentRound)),
        round: event.currentRound,
        youAnswered: event.youAnswered,
        opponentAnswered: event.opponentAnswered,
        submitting: false,
      }

      if (event.phase === 'reveal' && event.lastRoundEnded) {
        return { phase: 'reveal', match, current, ended: event.lastRoundEnded, nextRoundAt: event.phaseEndsAt }
      }
      return { phase: 'round', match, current }
    }

    case 'opponentConnection': {
      const match = matchOf(view)
      if (!match || match.duelId !== action.duelId || view.phase === 'results') return view
      return { ...view, match: { ...match, opponentConnected: action.connected } } as DuelView
    }

    case 'duelAborted':
      if (isOtherDuel(view, action.event.duelId)) return view
      return { phase: 'aborted', reason: action.event.reason }

    case 'submitStarted':
      if (view.phase !== 'round') return view
      return { ...view, current: { ...view.current, answer: action.answer, submitting: true, error: null } }

    case 'submitFinished': {
      if (view.phase !== 'round') return view
      const { ok, error } = action.result
      return {
        ...view,
        current: {
          ...view.current,
          submitting: false,
          youAnswered: view.current.youAnswered || ok,
          answer: ok ? view.current.answer : null,
          error: ok ? null : (error ?? 'Your answer was not accepted.'),
        },
      }
    }

    case 'backToLobby':
      return { phase: 'lobby', error: null }
  }
}

export function useDuel() {
  const [view, dispatch] = useReducer(reducer, { phase: 'connecting' })
  const [reconnecting, setReconnecting] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const connectionRef = useRef<HubConnection | null>(null)

  useEffect(() => {
    let stopped = false
    const connection = new HubConnectionBuilder()
      .withUrl('/hubs/duel', { accessTokenFactory: getFreshAccessToken })
      .withAutomaticReconnect()
      .configureLogging(LogLevel.Warning)
      .build()

    // Every handler is registered before start(), so no event is missed
    connection.on('QueueJoined', () => dispatch({ type: 'queueJoined' }))
    connection.on('QueueLeft', () => dispatch({ type: 'queueLeft' }))
    // Events with a deadline also resync the server clock that the countdowns use
    connection.on('MatchFound', (event: MatchFoundEvent) => {
      syncServerClock(event.serverTime)
      dispatch({ type: 'matchFound', event })
    })
    connection.on('RoundStarted', (event: RoundStartedEvent) => {
      syncServerClock(event.serverTime)
      dispatch({ type: 'roundStarted', event })
    })
    connection.on('AnswerAccepted', (event: RoundAnswerEvent) => dispatch({ type: 'answerAccepted', event }))
    connection.on('OpponentAnswered', (event: RoundAnswerEvent) => dispatch({ type: 'opponentAnswered', event }))
    connection.on('RoundEnded', (event: RoundEndedEvent) => dispatch({ type: 'roundEnded', event }))
    connection.on('DuelEnded', (event: DuelEndedEvent) => dispatch({ type: 'duelEnded', event }))
    connection.on('DuelState', (event: DuelStateEvent) => {
      syncServerClock(event.serverTime)
      dispatch({ type: 'duelState', event })
    })
    connection.on('OpponentDisconnected', (event: { duelId: string }) =>
      dispatch({ type: 'opponentConnection', duelId: event.duelId, connected: false }),
    )
    connection.on('OpponentReconnected', (event: { duelId: string }) =>
      dispatch({ type: 'opponentConnection', duelId: event.duelId, connected: true }),
    )
    connection.on('DuelAborted', (event: DuelAbortedEvent) => dispatch({ type: 'duelAborted', event }))

    connection.onreconnecting(() => {
      if (!stopped) setReconnecting(true)
    })
    connection.onreconnected(() => {
      if (!stopped) setReconnecting(false)
    })
    connection.onclose(() => {
      if (stopped) return
      setReconnecting(false)
      dispatch({ type: 'connectionFailed' })
    })

    connection
      .start()
      .then(() => {
        if (!stopped) dispatch({ type: 'connected' })
      })
      .catch(() => {
        if (!stopped) dispatch({ type: 'connectionFailed' })
      })
    connectionRef.current = connection

    return () => {
      stopped = true
      connectionRef.current = null
      connection.stop().catch(() => {})
    }
  }, [attempt])

  const joinQueue = useCallback(() => {
    connectionRef.current
      ?.invoke('JoinQueue')
      .catch(() => dispatch({ type: 'queueError', message: "Couldn't join the queue. Try again." }))
  }, [])

  const leaveQueue = useCallback(() => {
    connectionRef.current?.invoke('LeaveQueue').catch(() => dispatch({ type: 'queueLeft' }))
  }, [])

  const submitAnswer = useCallback((duelId: string, roundNumber: number, answer: Answer) => {
    const connection = connectionRef.current
    if (!connection) return
    dispatch({ type: 'submitStarted', answer })
    connection
      .invoke<SubmitResult>('SubmitAnswer', duelId, roundNumber, answer)
      .then((result) => dispatch({ type: 'submitFinished', result }))
      .catch(() =>
        dispatch({ type: 'submitFinished', result: { ok: false, error: "Couldn't send your answer. Try again." } }),
      )
  }, [])

  const backToLobby = useCallback(() => dispatch({ type: 'backToLobby' }), [])

  const retry = useCallback(() => {
    dispatch({ type: 'connecting' })
    setAttempt((value) => value + 1)
  }, [])

  return { view, reconnecting, joinQueue, leaveQueue, submitAnswer, backToLobby, retry }
}
