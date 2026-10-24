import { ApiError, request } from './client'
import { clearSession, loadSession, updateSession, type Session } from './session'

export interface User {
  id: string
  nickname: string
  email: string
}

export interface AuthResponse {
  accessToken: string
  accessTokenExpiresAt: string
  refreshToken: string
  refreshTokenExpiresAt: string
  user: User
}

export function signup(values: { email: string; username: string; password: string }) {
  return request<AuthResponse>('/api/auth/signup', {
    method: 'POST',
    // The backend calls the username "nickname"
    body: JSON.stringify({ nickname: values.username, email: values.email, password: values.password }),
  })
}

export function login(email: string, password: string) {
  return request<AuthResponse>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
}

export function logout(refreshToken: string) {
  return request<void>('/api/auth/logout', {
    method: 'POST',
    body: JSON.stringify({ refreshToken }),
  })
}

export function getMe() {
  return authFetch<User>('/api/auth/me')
}

// fetch for endpoints that need a logged-in user. On a 401 it refreshes the tokens once and retries.
export async function authFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const session = loadSession()
  if (!session) throw new ApiError(401, 'Log in to continue.')

  try {
    return await request<T>(path, withToken(init, session.accessToken))
  } catch (error) {
    if (!(error instanceof ApiError) || error.status !== 401) throw error

    const renewed = await refreshSession(session.accessToken)
    if (!renewed) throw error
    return request<T>(path, withToken(init, renewed.accessToken))
  }
}

function withToken(init: RequestInit, accessToken: string): RequestInit {
  return { ...init, headers: { ...init.headers, Authorization: `Bearer ${accessToken}` } }
}

// Shared by concurrent callers: the backend revokes a refresh token after one use and treats a
// second use as theft, logging the user out everywhere
let pendingRefresh: Promise<Session | null> | null = null

function refreshSession(staleAccessToken: string): Promise<Session | null> {
  pendingRefresh ??= runRefresh(staleAccessToken).finally(() => {
    pendingRefresh = null
  })
  return pendingRefresh
}

async function runRefresh(staleAccessToken: string): Promise<Session | null> {
  const current = loadSession()
  if (!current) return null
  // Another tab or request already refreshed; use its tokens instead of spending the old refresh token
  if (current.accessToken !== staleAccessToken) return current

  try {
    const response = await request<AuthResponse>('/api/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken: current.refreshToken }),
    })
    return updateSession(response)
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) clearSession()
    return null
  }
}
