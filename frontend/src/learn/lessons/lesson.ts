import type { Lesson, LessonBlock } from '../content'

interface LessonSpec {
  id: string
  title: string
  // What the concept is
  intro: string
  // How it works: an example, diagram, table or steps
  example: LessonBlock[]
  mistakes: string[]
  takeaway: string
}

// Builds a short lesson in the spec's order: introduction, example, common mistakes, key takeaway
export function lesson({ id, title, intro, example, mistakes, takeaway }: LessonSpec): Lesson {
  return {
    id,
    title,
    blocks: [
      { type: 'text', text: intro },
      ...example,
      { type: 'mistakes', items: mistakes },
      { type: 'takeaway', text: takeaway },
    ],
  }
}

export function code(file: string, lines: string[]): LessonBlock {
  return { type: 'code', file, code: lines.join('\n') }
}
