import type { AuthResponse, User } from './auth'

export interface Session {
  accessToken: string
  refreshToken: string
  user: User
}

const STORAGE_KEY = 'devbrawl.session'

// Fallback for when browser storage is blocked (e.g. private mode); lasts until the page reloads
let memorySession: Session | null = null

// "Remember me" keeps the session in localStorage; otherwise it ends when the browser closes
function storages(): Storage[] {
  try {
    return [localStorage, sessionStorage]
  } catch {
    return []
  }
}

function findStorage(): Storage | undefined {
  try {
    return storages().find((storage) => storage.getItem(STORAGE_KEY) !== null)
  } catch {
    return undefined
  }
}

// Reads storage first so tokens refreshed by another tab are picked up
export function loadSession(): Session | null {
  try {
    const raw = findStorage()?.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw) as Session
  } catch {
    // Fall through to the in-memory copy
  }
  return memorySession
}

export function startSession(response: AuthResponse, remember: boolean): Session {
  clearSession()
  return save(toSession(response), () => (remember ? localStorage : sessionStorage))
}

// Saves refreshed tokens to whichever storage already holds the session
export function updateSession(response: AuthResponse): Session {
  return save(toSession(response), () => findStorage())
}

export function clearSession() {
  memorySession = null
  for (const storage of storages()) {
    try {
      storage.removeItem(STORAGE_KEY)
    } catch {
      // Nothing to clear
    }
  }
}

function save(session: Session, pickStorage: () => Storage | undefined): Session {
  memorySession = session
  try {
    pickStorage()?.setItem(STORAGE_KEY, JSON.stringify(session))
  } catch {
    // Storage blocked; memorySession keeps the user logged in on this page
  }
  return session
}

function toSession(response: AuthResponse): Session {
  return {
    accessToken: response.accessToken,
    refreshToken: response.refreshToken,
    user: response.user,
  }
}
