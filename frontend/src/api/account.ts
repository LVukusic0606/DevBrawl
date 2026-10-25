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

// The avatar is not in the token, so the session stays as it is
export function changeAvatar(avatarId: number) {
  return authFetch<void>('/api/auth/avatar', { method: 'PUT', body: JSON.stringify({ avatarId }) })
}

// null removes the tag
export function changeTag(tag: string | null) {
  return authFetch<void>('/api/auth/tag', { method: 'PUT', body: JSON.stringify({ tag }) })
}

// Also logs out every other device
export function changePassword(currentPassword: string, newPassword: string) {
  return change('/api/auth/password', { currentPassword, newPassword })
}
