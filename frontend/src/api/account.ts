import { authFetch, type AuthResponse } from './auth'
import { updateSession } from './session'

// Every change returns a new token pair (the token carries the nickname and email), so the session is replaced

async function change(path: string, body: object) {
  const response = await authFetch<AuthResponse>(path, { method: 'PUT', body: JSON.stringify(body) })
  return updateSession(response)
}

export function changeNickname(nickname: string) {
  return change('/api/auth/nickname', { nickname })
}

export function changeEmail(email: string, currentPassword: string) {
  return change('/api/auth/email', { email, currentPassword })
}

// Also logs out every other device
export function changePassword(currentPassword: string, newPassword: string) {
  return change('/api/auth/password', { currentPassword, newPassword })
}
