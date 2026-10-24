import type { Lesson } from '../content'
import { API_LESSONS } from './apisNetworking'
import { DATABASE_LESSONS } from './databases'
import { DEBUGGING_LESSONS } from './debugging'
import { INFRASTRUCTURE_LESSONS } from './infrastructure'
import { SECURITY_LESSONS } from './security'
import { SYSTEM_DESIGN_LESSONS } from './systemDesign'

// Further lessons per category id, after the two written out in content.ts
export const MORE_LESSONS: Record<string, Lesson[]> = {
  'apis-networking': API_LESSONS,
  databases: DATABASE_LESSONS,
  security: SECURITY_LESSONS,
  debugging: DEBUGGING_LESSONS,
  'system-design': SYSTEM_DESIGN_LESSONS,
  infrastructure: INFRASTRUCTURE_LESSONS,
}
