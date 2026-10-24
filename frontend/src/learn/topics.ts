import type { Category, Lesson } from './content'

export interface Topic {
  name: string
  description: string
  icon: string
  lessonIds: string[]
}

// Lessons are independent; topics only group the ones that cover the same area of a category
const CATEGORY_TOPICS: Record<string, Topic[]> = {
  'apis-networking': [
    {
      name: 'HTTP basics',
      description: 'What a request and a response are made of.',
      icon: 'ti-world',
      lessonIds: ['api-request', 'http-methods', 'status-codes', 'headers', 'rest'],
    },
    {
      name: 'Reliability',
      description: 'Keeping calls working when the network or the load misbehaves.',
      icon: 'ti-heartbeat',
      lessonIds: ['timeouts', 'rate-limiting', 'http-caching'],
    },
    {
      name: 'Browser and real time',
      description: 'Rules the browser enforces and live updates.',
      icon: 'ti-browser',
      lessonIds: ['cors', 'polling-websockets'],
    },
  ],
  databases: [
    {
      name: 'Modeling data',
      description: 'How to shape and link the data you store.',
      icon: 'ti-table',
      lessonIds: ['relational-databases', 'primary-foreign-keys', 'normalization', 'relational-vs-document'],
    },
    {
      name: 'Fast queries',
      description: 'Getting answers without reading everything.',
      icon: 'ti-bolt',
      lessonIds: ['joins', 'indexes', 'n-plus-one'],
    },
    {
      name: 'Running a database',
      description: 'Keeping changes safe and the database healthy.',
      icon: 'ti-server-cog',
      lessonIds: ['transactions', 'connection-pools', 'migrations'],
    },
  ],
  security: [
    {
      name: 'Identity and access',
      description: 'Who someone is and what they may do.',
      icon: 'ti-id-badge-2',
      lessonIds: ['authn-vs-authz', 'jwt', 'least-privilege'],
    },
    {
      name: 'Untrusted input',
      description: 'Attacks that hide inside data users send.',
      icon: 'ti-alert-octagon',
      lessonIds: ['sql-injection', 'xss', 'csrf', 'input-validation'],
    },
    {
      name: 'Protecting data',
      description: 'Keeping passwords, traffic and keys safe.',
      icon: 'ti-lock',
      lessonIds: ['password-hashing', 'https', 'secrets'],
    },
  ],
  debugging: [
    {
      name: 'Finding the cause',
      description: 'Tools that point you at the problem.',
      icon: 'ti-search',
      lessonIds: ['stack-traces', 'reading-logs', 'breakpoints', 'bisect'],
    },
    {
      name: 'Common bug patterns',
      description: 'Mistakes that show up in every codebase.',
      icon: 'ti-bug',
      lessonIds: ['off-by-one', 'null-values', 'race-conditions'],
    },
    {
      name: 'Working method',
      description: 'Habits that make bugs easier to fix for good.',
      icon: 'ti-checklist',
      lessonIds: ['reproduce-bugs', 'rubber-duck', 'regression-tests'],
    },
  ],
  'system-design': [
    {
      name: 'Scaling out',
      description: 'Handling more users with more machines.',
      icon: 'ti-arrows-maximize',
      lessonIds: ['scaling', 'load-balancing', 'replication', 'sharding'],
    },
    {
      name: 'Speed and background work',
      description: 'Answering fast by doing less, or doing it later.',
      icon: 'ti-bolt',
      lessonIds: ['caching', 'queues'],
    },
    {
      name: 'Reliability and trade-offs',
      description: 'Staying correct and available when parts fail.',
      icon: 'ti-scale',
      lessonIds: ['consistency-availability', 'idempotency', 'designing-for-failure', 'monolith-microservices'],
    },
  ],
  infrastructure: [
    {
      name: 'Shipping code',
      description: 'Getting a change safely from a commit to users.',
      icon: 'ti-rocket',
      lessonIds: ['ci-cd', 'environments', 'rollbacks'],
    },
    {
      name: 'Packaging and running',
      description: 'How apps are packed, started and kept running.',
      icon: 'ti-package',
      lessonIds: ['containers', 'images-registries', 'orchestration', 'infrastructure-as-code'],
    },
    {
      name: 'Networking and operations',
      description: 'Finding servers and knowing they are healthy.',
      icon: 'ti-network',
      lessonIds: ['dns', 'reverse-proxy', 'monitoring'],
    },
  ],
}

export interface TopicGroup {
  topic: Topic
  lessons: Lesson[]
}

// Lessons not listed in any topic still show up, under "More lessons"
export function groupLessons(category: Category): TopicGroup[] {
  const topics = CATEGORY_TOPICS[category.id] ?? []
  const byId = new Map(category.lessons.map((item) => [item.id, item]))
  const groups = topics.map((topic) => ({
    topic,
    lessons: topic.lessonIds.flatMap((id) => byId.get(id) ?? []),
  }))

  const grouped = new Set(topics.flatMap((topic) => topic.lessonIds))
  const rest = category.lessons.filter((item) => !grouped.has(item.id))
  if (rest.length > 0) {
    groups.push({
      topic: { name: 'More lessons', description: '', icon: 'ti-book', lessonIds: rest.map((item) => item.id) },
      lessons: rest,
    })
  }
  return groups.filter((group) => group.lessons.length > 0)
}

// The first sentence of the lesson's introduction, used as its summary on the card
export function lessonSummary(lesson: Lesson) {
  const intro = lesson.blocks.find((block) => block.type === 'text')
  if (!intro || intro.type !== 'text') return ''
  const end = intro.text.search(/[.?!](\s|$)/)
  return end === -1 ? intro.text : intro.text.slice(0, end + 1)
}
