// Lessons finished in this browser. Kept in localStorage, a per-browser convenience rather than account data.
const STORAGE_KEY = 'devbrawl.completedLessons'

export function loadCompletedLessons(): string[] {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    const parsed: unknown = stored ? JSON.parse(stored) : []
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : []
  } catch {
    // Storage can be blocked or hold invalid data; the lessons then simply start as not done
    return []
  }
}

// Returns the new list, so the caller can keep its state in sync even when storage is blocked
export function saveCompletedLesson(id: string, completed: string[]): string[] {
  const next = completed.includes(id) ? completed : [...completed, id]
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch {
    // The mark still shows for this visit
  }
  return next
}
