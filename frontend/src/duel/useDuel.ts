import { HubConnection, HubConnectionBuilder, LogLevel } from '@microsoft/signalr'
import { useCallback, useEffect, useReducer, useRef, useState } from 'react'
import { getFreshAccessToken } from '../api/auth'
import { syncServerClock } from './serverClock'
import type {
  Answer,
  DuelAbortedEvent,
  DuelEndedEvent,
  DuelInvite,
  DuelInviteClosedEvent,
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
  // Against a friend: no ELO or XP
  friendly: boolean
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
  // notice: what happened to your last invite, e.g. the friend declined
  | { phase: 'lobby'; error: string | null; notice: string | null }
  | { phase: 'queue'; since: number }
  // Waiting for a friend to accept a friendly duel
  | { phase: 'inviting'; invite: DuelInvite }
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
  | { type: 'lobbyError'; message: string }
  | { type: 'inviteSent'; invite: DuelInvite }
  | { type: 'inviteClosed'; event: DuelInviteClosedEvent }
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

const LOBBY: Extract<DuelView, { phase: 'lobby' }> = { phase: 'lobby', error: null, notice: null }

// Phases where a duel is on screen; invite events never replace them
const PLAYING: DuelView['phase'][] = ['countdown', 'round', 'reveal']

function inviteNotice(event: DuelInviteClosedEvent, friend: string) {
  switch (event.reason) {
    case 'declined':
      return `${friend} declined the duel.`
    case 'expired':
      return `${friend} didn't answer in time.`
    case 'unavailable':
      return `${friend} can't play right now.`
    default:
      return null
  }
}

function reducer(view: DuelView, action: Action): DuelView {
  switch (action.type) {
    case 'connecting':
      return { phase: 'connecting' }

    case 'connected':
      // DuelState may already have rebuilt a running duel before start() resolved
      return view.phase === 'connecting' ? LOBBY : view

    case 'connectionFailed':
      return view.phase === 'results' ? view : { phase: 'connectionFailed' }

    case 'queueJoined':
      return { phase: 'queue', since: Date.now() }

    case 'queueLeft':
      return view.phase === 'queue' ? LOBBY : view

    case 'lobbyError':
      return { ...LOBBY, error: action.message }

    case 'inviteSent':
      return PLAYING.includes(view.phase) ? view : { phase: 'inviting', invite: action.invite }

    case 'inviteClosed': {
      const { event } = action
      if (view.phase !== 'inviting' || view.invite.inviteId !== event.inviteId) return view
      // MatchFound follows right away
      if (event.reason === 'accepted') return view
      return { ...LOBBY, notice: inviteNotice(event, view.invite.to.nickname) }
    }

    case 'matchFound': {
      const { event } = action
      return {
        phase: 'countdown',
        startsAt: event.startsAt,
        match: {
          duelId: event.duelId,
          you: event.you,
          opponent: event.opponent,
          friendly: event.friendly,
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
        friendly: event.friendly,
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
      return LOBBY
  }
}

export function useDuel() {
  const [view, dispatch] = useReducer(reducer, { phase: 'connecting' })
  const [reconnecting, setReconnecting] = useState(false)
  // Friendly duel invites from friends, oldest first
  const [incoming, setIncoming] = useState<DuelInvite[]>([])
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
    connection.on('DuelInviteSent', (invite: DuelInvite) => {
      syncServerClock(invite.serverTime)
      dispatch({ type: 'inviteSent', invite })
    })
    // Pending invites are sent again on every (re)connect, so the same one can arrive twice
    connection.on('DuelInviteReceived', (invite: DuelInvite) => {
      syncServerClock(invite.serverTime)
      setIncoming((list) => [...list.filter((item) => item.inviteId !== invite.inviteId), invite])
    })
    connection.on('DuelInviteClosed', (event: DuelInviteClosedEvent) => {
      setIncoming((list) => list.filter((item) => item.inviteId !== event.inviteId))
      dispatch({ type: 'inviteClosed', event })
    })

    connection.onreconnecting(() => {
      if (stopped) return
      setReconnecting(true)
      // The server resends the invites that are still pending once the connection is back
      setIncoming([])
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
      setIncoming([])
      connectionRef.current = null
      connection.stop().catch(() => {})
    }
  }, [attempt])

  const joinQueue = useCallback(() => {
    connectionRef.current
      ?.invoke('JoinQueue')
      .catch(() => dispatch({ type: 'lobbyError', message: "Couldn't join the queue. Try again." }))
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

  const inviteFriend = useCallback((friendId: string) => {
    connectionRef.current
      ?.invoke('InviteFriend', friendId)
      .catch((error: unknown) => dispatch({ type: 'lobbyError', message: hubErrorMessage(error, "Couldn't send the invite. Try again.") }))
  }, [])

  const acceptInvite = useCallback((inviteId: string) => {
    connectionRef.current?.invoke('AcceptInvite', inviteId).catch((error: unknown) => {
      setIncoming((list) => list.filter((item) => item.inviteId !== inviteId))
      dispatch({ type: 'lobbyError', message: hubErrorMessage(error, "Couldn't accept the invite. Try again.") })
    })
  }, [])

  // Declines an invite you received or withdraws the one you sent
  const dismissInvite = useCallback((inviteId: string) => {
    setIncoming((list) => list.filter((item) => item.inviteId !== inviteId))
    connectionRef.current?.invoke('DismissInvite', inviteId).catch(() => {})
  }, [])

  const backToLobby = useCallback(() => dispatch({ type: 'backToLobby' }), [])

  const retry = useCallback(() => {
    dispatch({ type: 'connecting' })
    setAttempt((value) => value + 1)
  }, [])

  return {
    view,
    reconnecting,
    incoming,
    joinQueue,
    leaveQueue,
    inviteFriend,
    acceptInvite,
    dismissInvite,
    submitAnswer,
    backToLobby,
    retry,
  }
}

// A rule the server refused (a HubException) arrives as "An unexpected error occurred invoking 'X' on the server.
// HubException: <message>"; only the message is meant for the player
function hubErrorMessage(error: unknown, fallback: string) {
  const text = error instanceof Error ? error.message : ''
  const marker = 'HubException: '
  const index = text.indexOf(marker)
  return index >= 0 ? text.slice(index + marker.length) : fallback
}
