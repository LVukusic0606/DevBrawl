import { authFetch } from './auth'

export interface InterviewLesson {
  id: string
  title: string
}

export interface InterviewCategory {
  id: string
  title: string
  lessons: InterviewLesson[]
}

export interface InterviewMessage {
  id: string
  role: 'interviewer' | 'candidate'
  content: string
  createdAt: string
}

export interface InterviewEvaluation {
  score: number
  summary: string
  strengths: string[]
  improvements: string[]
}

export type InterviewStatus = 'active' | 'finished'

export interface InterviewSession {
  id: string
  title: string
  categoryId: string
  lessonId: string | null
  status: InterviewStatus
  answersGiven: number
  maxAnswers: number
  createdAt: string
  finishedAt: string | null
  messages: InterviewMessage[]
  // Null while active, and when an interview ended without answers
  evaluation: InterviewEvaluation | null
}

export interface InterviewSummary {
  id: string
  title: string
  status: InterviewStatus
  score: number | null
  createdAt: string
}

export async function getInterviewTopics() {
  const response = await authFetch<{ categories: InterviewCategory[] }>('/api/interview/topics')
  return response.categories
}

export function listInterviews() {
  return authFetch<InterviewSummary[]>('/api/interview/sessions')
}

// A lesson interviews about that lesson, a category about all its lessons, neither picks a random category
export function startInterview(choice: { lessonId?: string; categoryId?: string }) {
  return authFetch<InterviewSession>('/api/interview/sessions', {
    method: 'POST',
    body: JSON.stringify(choice),
  })
}

export function getInterview(id: string) {
  return authFetch<InterviewSession>(`/api/interview/sessions/${id}`)
}

// Returns the whole session with the answer and the interviewer's reply added
export function sendInterviewMessage(id: string, content: string) {
  return authFetch<InterviewSession>(`/api/interview/sessions/${id}/messages`, {
    method: 'POST',
    body: JSON.stringify({ content }),
  })
}

// Ends the interview early, or retries feedback that failed to generate
export function finishInterview(id: string) {
  return authFetch<InterviewSession>(`/api/interview/sessions/${id}/finish`, { method: 'POST' })
}

// Returns an empty string when no speech was heard
export async function transcribeAnswer(sessionId: string, recording: Blob) {
  const form = new FormData()
  form.append('audio', recording, 'answer.wav')
  const response = await authFetch<{ text: string }>(`/api/interview/sessions/${sessionId}/transcribe`, {
    method: 'POST',
    body: form,
  })
  return response.text
}
