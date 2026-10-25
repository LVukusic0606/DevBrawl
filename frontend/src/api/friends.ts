import { authFetch } from './auth'

// Friends can play friendly duels, which change no ELO or XP. Duel invites go over the duel hub (see duel/useDuel).

export interface FriendUser {
  id: string
  nickname: string
  // Preset avatar and tag, as on the profile; null when not picked
  avatarId: number | null
  tag: string | null
  // Overall rating: the average of the category ratings
  rating: number
}

export interface Friend {
  user: FriendUser
  since: string
}

// user is the other player: who sent an incoming request, who receives an outgoing one
export interface FriendRequest {
  id: string
  user: FriendUser
  sentAt: string
}

export interface Friends {
  // By nickname
  friends: Friend[]
  // Newest first
  incoming: FriendRequest[]
  outgoing: FriendRequest[]
}

export type FriendshipState = 'none' | 'friends' | 'requestSent' | 'requestReceived'

// Every change returns the updated lists

export function getFriends() {
  return authFetch<Friends>('/api/friends')
}

// If that player already sent you a request, this accepts it
export function sendFriendRequest(nickname: string) {
  return authFetch<Friends>('/api/friends/requests', { method: 'POST', body: JSON.stringify({ nickname }) })
}

export function acceptFriendRequest(requestId: string) {
  return authFetch<Friends>(`/api/friends/requests/${encodeURIComponent(requestId)}/accept`, { method: 'POST' })
}

// Declines a request you received or withdraws one you sent
export function deleteFriendRequest(requestId: string) {
  return authFetch<Friends>(`/api/friends/requests/${encodeURIComponent(requestId)}`, { method: 'DELETE' })
}

export function removeFriend(friendId: string) {
  return authFetch<Friends>(`/api/friends/${encodeURIComponent(friendId)}`, { method: 'DELETE' })
}
