import type { Lesson } from '../content'
import { code, lesson } from './lesson'

export const SYSTEM_DESIGN_LESSONS: Lesson[] = [
  lesson({
    id: 'load-balancing',
    title: 'Load balancing',
    intro:
      'A load balancer sits in front of several servers and decides which one handles each request. It spreads the work and stops sending traffic to servers that are down.',
    example: [
      {
        type: 'table',
        headers: ['Strategy', 'Picks', 'Works well when'],
        rows: [
          ['Round robin', 'The next server in turn', 'Requests cost about the same'],
          ['Least connections', 'The server with the fewest open requests', 'Some requests are much slower'],
          ['Hash of the user', 'The same server for the same user', 'A server keeps a local cache per user'],
        ],
      },
    ],
    mistakes: [
      'Skipping health checks, so traffic keeps going to a crashed server.',
      'Depending on sticky sessions so much that one busy user overloads one server.',
    ],
    takeaway: 'Spread requests with health checks on, and keep servers interchangeable.',
  }),
  lesson({
    id: 'queues',
    title: 'Message queues',
    intro:
      'Some work does not need to finish before the user gets an answer, such as sending an email. A queue stores the task so a worker can do it later.',
    example: [
      {
        type: 'steps',
        steps: [
          'The API puts “send welcome email” on the queue',
          'The API answers the user right away',
          'A worker takes the task from the queue',
          'The worker sends the email',
          'If it fails, the task goes back on the queue for a retry',
        ],
      },
    ],
    mistakes: [
      'Doing slow work inside the request, so the user waits for it.',
      'Workers that can’t handle the same task twice after a retry.',
    ],
    takeaway: 'Queue work that can wait. Make workers safe to run the same task more than once.',
  }),
  lesson({
    id: 'replication',
    title: 'Database replication',
    intro:
      'Replication keeps copies of the database on other servers. Writes go to the primary, and replicas follow it and can serve reads.',
    example: [
      code('one primary, two replicas', [
        'writes → primary ──┬──→ replica 1 ← reads',
        '                   └──→ replica 2 ← reads',
      ]),
      {
        type: 'text',
        text: 'Replicas lag a little behind. A user who just saved something may not see it yet if the next read hits a replica.',
      },
    ],
    mistakes: [
      'Reading from a replica right after a write and showing stale data.',
      'Calling replicas a backup; a bad delete is copied to them too.',
    ],
    takeaway: 'Replicas add read capacity and failover, not backups. Read your own writes from the primary.',
  }),
  lesson({
    id: 'sharding',
    title: 'Sharding',
    intro:
      'When one database is too big for one server, sharding splits the rows across several databases. A shard key decides where each row lives.',
    example: [
      {
        type: 'table',
        headers: ['Shard key', 'Shard 1', 'Shard 2', 'Shard 3'],
        rows: [['user id % 3', 'users 3, 6, 9 …', 'users 1, 4, 7 …', 'users 2, 5, 8 …']],
      },
    ],
    mistakes: [
      'Picking a key that sends most traffic to one shard, such as the country.',
      'Sharding before simpler steps like indexes, caching or replicas.',
    ],
    takeaway: 'Shard last, and choose a key that spreads both data and traffic evenly.',
  }),
  lesson({
    id: 'consistency-availability',
    title: 'Consistency vs. availability',
    intro:
      'When servers lose contact with each other, a system must choose: refuse some requests to stay correct, or keep answering and risk being out of date.',
    example: [
      {
        type: 'table',
        headers: ['Choice', 'During a network split', 'Fits'],
        rows: [
          ['Consistency first', 'Some requests fail until servers agree again', 'Balances, ratings, stock'],
          ['Availability first', 'Every request is answered, maybe with old data', 'Feeds, view counts, profiles'],
        ],
      },
    ],
    mistakes: [
      'Assuming the network between servers never fails.',
      'Using the same choice for every kind of data in the app.',
    ],
    takeaway: 'Decide per piece of data whether being right or being up matters more.',
  }),
  lesson({
    id: 'idempotency',
    title: 'Idempotent operations',
    intro:
      'An operation is idempotent when doing it twice has the same effect as doing it once. It makes retries safe after a timeout.',
    example: [
      code('a retried payment', [
        'POST /api/payments',
        'Idempotency-Key: 6f1c-8a20',
        '',
        'first try:   payment created',
        'retry:       same key → the server returns the first result',
      ]),
    ],
    mistakes: [
      'Retrying a POST without a key and charging the user twice.',
      'Generating a new key on every retry.',
    ],
    takeaway: 'Give risky operations a key, and let the server recognize a repeat.',
  }),
  lesson({
    id: 'designing-for-failure',
    title: 'Designing for failure',
    intro:
      'In a system with many parts, something is always failing somewhere. Good design keeps one broken part from taking down the rest.',
    example: [
      {
        type: 'steps',
        steps: [
          'Calls to the recommendation service start timing out',
          'A circuit breaker counts the failures',
          'After a few, it stops calling the service for a while',
          'The page shows lessons without recommendations',
          'Later it tries again and closes when calls succeed',
        ],
      },
    ],
    mistakes: [
      'Letting every page wait on an optional service.',
      'Retrying a failing service so hard that it can never recover.',
    ],
    takeaway: 'Use timeouts, fail fast and degrade gracefully when an optional part is down.',
  }),
  lesson({
    id: 'monolith-microservices',
    title: 'Monolith vs. microservices',
    intro:
      'A monolith is one app deployed as a whole. Microservices split it into small services that are deployed and scaled separately.',
    example: [
      {
        type: 'table',
        headers: ['', 'Monolith', 'Microservices'],
        rows: [
          ['Deploy', 'Everything at once', 'Each service on its own'],
          ['Calls between parts', 'Function calls', 'Network calls that can fail'],
          ['Good fit', 'Small teams and young products', 'Many teams that need to move independently'],
        ],
      },
    ],
    mistakes: [
      'Starting with microservices for a small team and paying the network cost everywhere.',
      'Splitting services that still share one database and must deploy together.',
    ],
    takeaway: 'Start with a well-structured monolith. Split out a service when a real need appears.',
  }),
]
