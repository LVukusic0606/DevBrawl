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

export interface InterviewQuestion {
  id: string
  categoryId: string
  categoryTitle: string
  lessonId: string
  lessonTitle: string
  question: string
  createdAt: string
}

export type Verdict = 'correct' | 'partiallyCorrect' | 'incorrect'

export interface AnswerReview {
  questionId: string
  verdict: Verdict
  score: number
  feedback: string
  strengths: string[]
  improvements: string[]
  modelAnswer: string
}

export async function getInterviewTopics() {
  const response = await authFetch<{ categories: InterviewCategory[] }>('/api/interview/topics')
  return response.categories
}

// No lesson picks a random one, from the category if one is given
export function createInterviewQuestion(choice: { lessonId?: string; categoryId?: string }) {
  return authFetch<InterviewQuestion>('/api/interview/questions', {
    method: 'POST',
    body: JSON.stringify(choice),
  })
}

// Returns an empty string when no speech was heard
export async function transcribeAnswer(questionId: string, recording: Blob) {
  const form = new FormData()
  form.append('audio', recording, 'answer.wav')
  const response = await authFetch<{ text: string }>(`/api/interview/questions/${questionId}/transcribe`, {
    method: 'POST',
    body: form,
  })
  return response.text
}

export function submitInterviewAnswer(questionId: string, answer: string) {
  return authFetch<AnswerReview>(`/api/interview/questions/${questionId}/answer`, {
    method: 'POST',
    body: JSON.stringify({ answer }),
  })
}
