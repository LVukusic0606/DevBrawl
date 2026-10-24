import { MORE_LESSONS } from './lessons'

export type VisualId = 'branches'

export interface TextBlock {
  type: 'text'
  text: string
}

export interface CodeBlock {
  type: 'code'
  file: string
  code: string
}

export interface StepsBlock {
  type: 'steps'
  steps: string[]
}

export interface TableBlock {
  type: 'table'
  headers: string[]
  rows: string[][]
}

export interface TimelineBlock {
  type: 'timeline'
  items: { title: string; detail: string }[]
}

export interface VisualBlock {
  type: 'visual'
  visual: VisualId
}

export interface MistakesBlock {
  type: 'mistakes'
  items: string[]
}

export interface TakeawayBlock {
  type: 'takeaway'
  text: string
}

export type LessonBlock =
  | TextBlock
  | CodeBlock
  | StepsBlock
  | TableBlock
  | TimelineBlock
  | VisualBlock
  | MistakesBlock
  | TakeawayBlock

export interface Lesson {
  id: string
  title: string
  blocks: LessonBlock[]
}

// The six categories match the ELO categories in spec.md (section 2) and the files in backend/Questions
export interface Category {
  id: string
  title: string
  description: string
  icon: string
  lessons: Lesson[]
}

const BASE_CATEGORIES: Category[] = [
  {
    id: 'apis-networking',
    title: 'APIs & Networking',
    description: 'How clients and servers talk to each other over the network.',
    icon: 'ti-api',
    lessons: [
      {
        id: 'api-request',
        title: 'What happens during an API request?',
        blocks: [
          {
            type: 'text',
            text: 'A server is a program that waits for requests and answers them. The client, such as a browser or a phone, is the one that asks.',
          },
          {
            type: 'steps',
            steps: [
              'Client sends a request',
              'Server checks who is asking',
              'Server runs the logic',
              'Server reads or writes data',
              'Server sends a response',
            ],
          },
          {
            type: 'text',
            text: 'Each request stands on its own. The server knows who is asking only if the request says so, usually with a token that proves the login.',
          },
          {
            type: 'code',
            file: 'api/',
            code: [
              'api/',
              '├── controllers/    receive requests, return responses',
              '├── services/       the rules of the app',
              '├── repositories/   talk to the database',
              '└── models/         the shape of the data',
            ].join('\n'),
          },
          {
            type: 'mistakes',
            items: [
              'Expecting the server to remember the previous request without a token or session.',
              'Putting business rules in controllers, so the same rule ends up copied in many places.',
              'Treating a request as instant and forgetting that the network can be slow or fail.',
            ],
          },
          {
            type: 'takeaway',
            text: 'A request travels through layers in order, and each layer does one job. Every request has to carry everything the server needs to answer it.',
          },
        ],
      },
      {
        id: 'http-methods',
        title: 'HTTP methods: GET, POST, PUT, PATCH and DELETE',
        blocks: [
          {
            type: 'text',
            text: 'A method tells the server what the client wants to do. The same address can accept different methods, and each one means something different.',
          },
          {
            type: 'table',
            headers: ['Method', 'Intent', 'Changes data?'],
            rows: [
              ['GET', 'Read something', 'No'],
              ['POST', 'Create something new', 'Yes'],
              ['PUT', 'Replace something', 'Yes'],
              ['PATCH', 'Change part of something', 'Yes'],
              ['DELETE', 'Remove something', 'Yes'],
            ],
          },
          {
            type: 'code',
            file: 'the same address, different intent',
            code: [
              'GET     /lessons/12    read lesson 12',
              'DELETE  /lessons/12    remove lesson 12',
              'POST    /lessons       create a new lesson',
            ].join('\n'),
          },
          {
            type: 'mistakes',
            items: [
              'Changing data in a GET request, so a page refresh or a link preview changes things.',
              'Retrying a failed POST automatically and creating the same item twice.',
              'Using POST for everything, which hides what each request actually does.',
            ],
          },
          {
            type: 'takeaway',
            text: 'Repeating a GET is safe because it changes nothing. Repeating a POST may create a second item, so pick the method that matches the intent.',
          },
        ],
      },
    ],
  },
  {
    id: 'databases',
    title: 'Databases',
    description: 'How data is stored, linked and kept consistent.',
    icon: 'ti-database',
    lessons: [
      {
        id: 'relational-databases',
        title: 'Relational databases',
        blocks: [
          {
            type: 'text',
            text: 'Data has to outlive a single request. A database keeps it safely and lets many users read and write at the same time.',
          },
          {
            type: 'table',
            headers: ['id', 'nickname', 'elo'],
            rows: [
              ['1', 'mara', '1350'],
              ['2', 'ivan', '1080'],
              ['3', 'lea', '1510'],
            ],
          },
          {
            type: 'text',
            text: 'A row is one record, and a column is one property that every record has. Because each column holds one kind of value, the data stays predictable.',
          },
          {
            type: 'steps',
            steps: ['Create a record', 'Read records that match', 'Update a record', 'Delete a record'],
          },
          {
            type: 'mistakes',
            items: [
              'Storing several values in one column, such as a comma-separated list of tags.',
              'Using a text column for numbers or dates, so sorting and comparing break.',
            ],
          },
          {
            type: 'takeaway',
            text: 'Tables give every record the same shape. Create, read, update and delete cover most of the work a database does.',
          },
        ],
      },
      {
        id: 'primary-foreign-keys',
        title: 'Primary and foreign keys',
        blocks: [
          {
            type: 'text',
            text: 'Copying the same data into many places causes mistakes. A better way is to store each fact once and link to it by a key.',
          },
          {
            type: 'table',
            headers: ['users.id', 'nickname'],
            rows: [
              ['1', 'mara'],
              ['2', 'ivan'],
            ],
          },
          {
            type: 'table',
            headers: ['duels.id', 'winner_id', 'loser_id'],
            rows: [
              ['10', '1', '2'],
              ['11', '2', '1'],
            ],
          },
          {
            type: 'text',
            text: 'The primary key identifies one row. A foreign key stores the primary key of a row in another table, such as winner_id pointing at users.id.',
          },
          {
            type: 'mistakes',
            items: [
              'Copying the nickname into every duel, so a rename leaves old duels out of date.',
              'Skipping the foreign key constraint, so a duel can point at a user that was deleted.',
              'Using a value that can change, such as an email, as the primary key.',
            ],
          },
          {
            type: 'takeaway',
            text: 'Store each fact once and link to it by key. The database can then guarantee that every link points at a real row.',
          },
        ],
      },
    ],
  },
  {
    id: 'security',
    title: 'Security',
    description: 'How apps protect users, data and access.',
    icon: 'ti-shield-lock',
    lessons: [
      {
        id: 'authn-vs-authz',
        title: 'Authentication vs. authorization',
        blocks: [
          {
            type: 'text',
            text: 'Authentication answers who you are. Authorization answers what you are allowed to do. They are separate checks, and each one fails in its own way.',
          },
          {
            type: 'table',
            headers: ['Question', 'Concept', 'When it fails'],
            rows: [
              ['Who are you?', 'Authentication', '401 Unauthorized'],
              ['Are you allowed to do this?', 'Authorization', '403 Forbidden'],
            ],
          },
          {
            type: 'code',
            file: 'two requests to the same address',
            code: [
              'GET /admin/users     no token',
              '→ 401 Unauthorized   log in first',
              '',
              'GET /admin/users     token of a regular user',
              '→ 403 Forbidden      logged in, but not allowed',
            ].join('\n'),
          },
          {
            type: 'mistakes',
            items: [
              'Returning 403 when the user is simply not logged in.',
              'Checking permissions only in the frontend, where anyone can skip the check.',
              'Trusting a user id sent in the request body instead of the one in the token.',
            ],
          },
          {
            type: 'takeaway',
            text: 'Authentication proves identity, and authorization decides access. Check both on the server, on every request.',
          },
        ],
      },
      {
        id: 'password-hashing',
        title: 'Storing passwords safely',
        blocks: [
          {
            type: 'text',
            text: 'A server should never be able to read a password. Instead it stores a hash: the result of a one-way function that cannot be turned back into the password.',
          },
          {
            type: 'steps',
            steps: [
              'The user picks a password',
              'The server adds a random salt',
              'The server runs a slow hash function',
              'Only the salt and the hash are stored',
              'At login, the same steps run and the results are compared',
            ],
          },
          {
            type: 'code',
            file: 'users table',
            code: [
              'id  email            password_hash',
              '1   mara@mail.com    $2b$12$Kq8f...   salt + hash, never the password',
            ].join('\n'),
          },
          {
            type: 'mistakes',
            items: [
              'Using a fast hash such as MD5 or SHA-1, which attackers can try billions of times per second.',
              'Encrypting passwords instead of hashing them, so anyone with the key can read them.',
              'Using the same salt for every user.',
            ],
          },
          {
            type: 'takeaway',
            text: 'Store a slow, salted hash. If the database leaks, the passwords stay hard to recover.',
          },
        ],
      },
    ],
  },
  {
    id: 'debugging',
    title: 'Debugging',
    description: 'How to find out why code does not do what you expect.',
    icon: 'ti-bug',
    lessons: [
      {
        id: 'stack-traces',
        title: 'Reading a stack trace',
        blocks: [
          {
            type: 'text',
            text: 'When a program crashes, it prints the chain of calls that led to the crash. That chain is the stack trace, and it is the fastest map to the problem.',
          },
          {
            type: 'code',
            file: 'console',
            code: [
              "TypeError: Cannot read properties of undefined (reading 'name')",
              '    at formatWinner    (duel/result.ts:14)',
              '    at showResult      (duel/screen.ts:42)',
              '    at onDuelFinished  (duel/socket.ts:88)',
            ].join('\n'),
          },
          {
            type: 'steps',
            steps: [
              'Read the message: what went wrong',
              'Read the first line: where it broke',
              'Read the lines below: who called it',
              'Find where the bad value came from',
            ],
          },
          {
            type: 'mistakes',
            items: [
              'Reading only the error message and skipping the location.',
              'Assuming the fix always goes on the top line, when the caller passed the bad data.',
              'Giving up when the top lines point into a library, while your own code is a few lines further down.',
            ],
          },
          {
            type: 'takeaway',
            text: 'The message says what, the first line says where, and the lines below say how the program got there.',
          },
        ],
      },
      {
        id: 'reproduce-bugs',
        title: 'Reproduce before you fix',
        blocks: [
          {
            type: 'text',
            text: 'A bug you cannot trigger on purpose is a bug you cannot prove you fixed. The first job is to make it happen again, every time.',
          },
          {
            type: 'code',
            file: 'bug report',
            code: [
              'Steps:     open a duel, answer the last question in under 1 second',
              'Expected:  the result screen shows the winner',
              'Actual:    the result screen is empty',
              'Happens:   3 out of 3 tries',
            ].join('\n'),
          },
          {
            type: 'timeline',
            items: [
              { title: 'Reproduce', detail: 'Follow the steps until the bug appears on your machine.' },
              { title: 'Shrink', detail: 'Remove steps until only the ones that matter are left.' },
              { title: 'Find the cause', detail: 'Change one thing at a time and watch what changes.' },
              { title: 'Fix and confirm', detail: 'Run the same steps again and check the bug is gone.' },
            ],
          },
          {
            type: 'mistakes',
            items: [
              'Changing code before the bug can be reproduced.',
              'Changing several things at once, so you cannot tell which one helped.',
              'Testing only the usual path after the fix.',
            ],
          },
          {
            type: 'takeaway',
            text: 'Make the bug happen on purpose, change one thing at a time, and confirm the fix with the same steps.',
          },
        ],
      },
    ],
  },
  {
    id: 'system-design',
    title: 'System Design',
    description: 'How to build systems that stay fast and reliable as they grow.',
    icon: 'ti-sitemap',
    lessons: [
      {
        id: 'caching',
        title: 'Caching',
        blocks: [
          {
            type: 'text',
            text: 'Some answers are expensive to compute but rarely change. A cache keeps a copy of the answer close by, so the next request does not have to do the work again.',
          },
          {
            type: 'steps',
            steps: [
              'A request arrives',
              'Look in the cache',
              'Hit: return the stored answer',
              'Miss: ask the database',
              'Save the answer in the cache for next time',
            ],
          },
          {
            type: 'table',
            headers: ['Request', 'Without a cache', 'With a cache'],
            rows: [
              ['Leaderboard', 'A database query every time', 'One query per minute'],
              ['Lesson text', 'A database query every time', 'One query until the lesson changes'],
            ],
          },
          {
            type: 'mistakes',
            items: [
              'Caching data that must always be current, such as a live duel score.',
              'Forgetting to clear the cache when the data changes.',
              'Giving every entry the same expiry, so they all expire at once and hit the database together.',
            ],
          },
          {
            type: 'takeaway',
            text: 'A cache trades freshness for speed. Decide how out of date each piece of data is allowed to be.',
          },
        ],
      },
      {
        id: 'scaling',
        title: 'Vertical and horizontal scaling',
        blocks: [
          {
            type: 'text',
            text: 'When one server is not enough, there are two ways to grow: make the server bigger, or add more servers.',
          },
          {
            type: 'table',
            headers: ['Approach', 'How', 'Limit'],
            rows: [
              ['Vertical', 'A bigger machine', 'One machine can only get so big'],
              ['Horizontal', 'More machines behind a load balancer', 'Any server must be able to handle any request'],
            ],
          },
          {
            type: 'code',
            file: 'horizontal scaling',
            code: [
              '                      ┌─→ server 1',
              'client → load balancer ├─→ server 2',
              '                      └─→ server 3',
            ].join('\n'),
          },
          {
            type: 'mistakes',
            items: [
              'Keeping sessions in server memory, so a user is logged out when the next request lands on another server.',
              'Adding app servers while the database stays the bottleneck.',
            ],
          },
          {
            type: 'takeaway',
            text: 'Horizontal scaling works when servers keep no state of their own. Put shared state in a database or cache instead.',
          },
        ],
      },
    ],
  },
  {
    id: 'infrastructure',
    title: 'Infrastructure',
    description: 'Where code runs and how it gets there.',
    icon: 'ti-cloud',
    lessons: [
      {
        id: 'ci-cd',
        title: 'From commit to production',
        blocks: [
          {
            type: 'text',
            text: 'Work happens on a branch, apart from the main line. When it is ready, it is merged back, and an automated pipeline takes it the rest of the way.',
          },
          { type: 'visual', visual: 'branches' },
          {
            type: 'steps',
            steps: [
              'Push a commit to the branch',
              'CI builds the project',
              'CI runs the tests',
              'The change is reviewed and merged',
              'CD deploys main to production',
            ],
          },
          {
            type: 'mistakes',
            items: [
              'Deploying by hand, so every release is a little different.',
              'Skipping tests to ship faster, then spending longer on the bugs.',
              'Letting a branch live for weeks, so the merge turns into a big conflict.',
            ],
          },
          {
            type: 'takeaway',
            text: 'Automate the path from commit to production, so every release goes through the same checks.',
          },
        ],
      },
      {
        id: 'environments',
        title: 'Environments and configuration',
        blocks: [
          {
            type: 'text',
            text: 'The same code runs on your machine, on a test server and in production. What changes between them is configuration, not code.',
          },
          {
            type: 'code',
            file: 'config/',
            code: [
              'config/',
              '├── development    local database, detailed logs',
              '├── staging        test server, data close to the real thing',
              '└── production     real users, secrets loaded from a vault',
            ].join('\n'),
          },
          {
            type: 'text',
            text: 'Secrets such as database passwords and API keys come from the environment when the app starts. They never live in the repository.',
          },
          {
            type: 'mistakes',
            items: [
              'Committing passwords or API keys to the repository.',
              'Building a different version of the app for each environment.',
              'Testing only on your own machine, where the setup differs from production.',
            ],
          },
          {
            type: 'takeaway',
            text: 'Build once, configure per environment, and keep secrets out of the code.',
          },
        ],
      },
    ],
  },
]

// Each category has 10 lessons: the two above plus eight more from ./lessons
export const CATEGORIES: Category[] = BASE_CATEGORIES.map((category) => ({
  ...category,
  lessons: [...category.lessons, ...(MORE_LESSONS[category.id] ?? [])],
}))
