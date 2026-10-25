import { authFetch } from './auth'

// Slugs of the lessons the logged-in player has finished, kept on the account so every device sees them
export function getCompletedLessons() {
  return authFetch<string[]>('/api/lessons/completed')
}

// Completing a lesson again is a no-op on the backend
export function markLessonCompleted(lessonId: string) {
  return authFetch<void>(`/api/lessons/${encodeURIComponent(lessonId)}/completed`, { method: 'PUT' })
}
