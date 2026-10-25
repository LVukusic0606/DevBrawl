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
  // Highlight.js language name, such as 'typescript' or 'http'; without it the code shows as plain text
  language?: string
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

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

export type Trait = 'yes' | 'no' | 'depends'

// Tap a method to see its facts, one request and its response
export interface MethodExplorerBlock {
  type: 'method-explorer'
  methods: {
    method: HttpMethod
    intent: string
    changesData: boolean
    repeatSafe: Trait
    request: string
    response: string
    note: string
  }[]
}

// Learner presses buttons and watches the server state change
export interface RetryDemoBlock {
  type: 'retry-demo'
}

// Heading that splits a long lesson into parts
export interface SectionBlock {
  type: 'section'
  title: string
}

// Learner types "next step" to reveal the next call; each one animates in and shows its result
export interface WalkthroughBlock {
  type: 'walkthrough'
  steps: { code: string; result: string; note: string }[]
}

export type LessonBlock =
  | TextBlock
  | CodeBlock
  | StepsBlock
  | TableBlock
  | TimelineBlock
  | VisualBlock
  | MethodExplorerBlock
  | RetryDemoBlock
  | SectionBlock
  | WalkthroughBlock
  | MistakesBlock
  | TakeawayBlock

// Asks the learner to pick the HTTP method that fits a scenario
export interface QuizQuestion {
  scenario: string
  answer: HttpMethod
  explanation: string
}

export interface Lesson {
  id: string
  title: string
  blocks: LessonBlock[]
  // Optional: lessons with a quiz get a button at the bottom that opens the quiz screen
  quiz?: QuizQuestion[]
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
        quiz: [
          {
            scenario: 'Show the list of lessons on the screen.',
            answer: 'GET',
            explanation: 'Reading changes nothing, so it is a GET.',
          },
          {
            scenario: 'Add a new comment under lesson 12.',
            answer: 'POST',
            explanation: 'The comment does not exist yet. The server creates it and picks its address.',
          },
          {
            scenario: 'Fix one typo in the title of lesson 12.',
            answer: 'PATCH',
            explanation: 'Only one field changes, so PATCH fits better than sending the whole lesson.',
          },
          {
            scenario: 'Save the full lesson 12 from the editor, replacing the old copy.',
            answer: 'PUT',
            explanation: 'The complete copy replaces the old one. Sending it twice gives the same result.',
          },
          {
            scenario: 'Remove duel 45 from the history.',
            answer: 'DELETE',
            explanation: 'The intent is to remove something, and it stays removed.',
          },
        ],
        blocks: [
          {
            type: 'section',
            title: 'Terms',
          },
          {
            type: 'table',
            headers: ['Term', 'Meaning'],
            rows: [
              ['Resource', 'A thing the API manages, with its own address, such as a lesson'],
              ['Method', 'The verb: what to do with the resource'],
              ['Body', 'The content sent or returned, usually JSON'],
              ['Safe', 'The request never changes data'],
              ['Idempotent (safe to repeat)', 'Sending it once or many times leaves the same result'],
              ['Status code', 'The three-digit answer that says how it went'],
            ],
          },
          {
            type: 'section',
            title: 'General explanation',
          },
          {
            type: 'text',
            text: 'A method tells the server what the client wants to do. The same address can accept several methods, and each one means something different.',
          },
          {
            type: 'text',
            text: 'Every request has the same parts: a method, an address, headers and, sometimes, a body. The server reads the method first.',
          },
          {
            type: 'code',
            file: 'anatomy of a request',
            language: 'http',
            code: [
              'PATCH /api/lessons/12           method + address',
              'Host: devbrawl.io               where to send it',
              'Content-Type: application/json  how the body is written',
              'Authorization: Bearer eyJhbGc…  who is asking',
              '',
              '{ "title": "HTTP verbs" }        body: the change itself',
            ].join('\n'),
          },
          {
            type: 'section',
            title: 'Usage examples',
          },
          {
            type: 'method-explorer',
            methods: [
              {
                method: 'GET',
                intent: 'Read something',
                changesData: false,
                repeatSafe: 'yes',
                request: 'GET /lessons/12',
                response: '200 OK\n{ "id": 12, "title": "HTTP methods" }',
                note: 'The server only reads. Nothing changes, so you can send the same GET as often as you like.',
              },
              {
                method: 'POST',
                intent: 'Create something new',
                changesData: true,
                repeatSafe: 'no',
                request: 'POST /lessons',
                response: '201 Created\nLocation: /lessons/13',
                note: 'The server picks the new address. Every repeat creates another lesson.',
              },
              {
                method: 'PUT',
                intent: 'Replace the whole thing',
                changesData: true,
                repeatSafe: 'yes',
                request: 'PUT /lessons/12',
                response: '200 OK\n{ "id": 12, "title": "HTTP methods", "body": "..." }',
                note: 'The client sends the complete lesson. Sending the same copy twice leaves the same result.',
              },
              {
                method: 'PATCH',
                intent: 'Change part of it',
                changesData: true,
                repeatSafe: 'depends',
                request: 'PATCH /lessons/12\n{ "title": "HTTP verbs" }',
                response: '200 OK\n{ "id": 12, "title": "HTTP verbs" }',
                note: 'Only the sent fields change. Setting a title is safe to repeat. Adding 1 to a view counter is not.',
              },
              {
                method: 'DELETE',
                intent: 'Remove something',
                changesData: true,
                repeatSafe: 'yes',
                request: 'DELETE /lessons/12',
                response: '204 No Content',
                note: 'The first call removes lesson 12. Repeating it returns 404 Not Found, but the lesson is still gone.',
              },
            ],
          },
          {
            type: 'text',
            text: 'The address is the noun and the method is the verb. One address, four verbs: GET reads, PUT replaces, PATCH changes a part, DELETE removes.',
          },
          {
            type: 'table',
            headers: ['Method', 'Changes data?', 'Safe to repeat?'],
            rows: [
              ['GET', 'No', 'Yes'],
              ['POST', 'Yes', 'No'],
              ['PUT', 'Yes', 'Yes'],
              ['PATCH', 'Yes', 'Depends on the change'],
              ['DELETE', 'Yes', 'Yes'],
            ],
          },
          {
            type: 'text',
            text: 'Safe means nothing changes on the server. Safe to repeat means sending the same request again leaves the same result.',
          },
          {
            type: 'text',
            text: 'A plain HTML form sends only GET and POST. Other methods need JavaScript, such as fetch.',
          },
          {
            type: 'code',
            file: 'a delete button, in the browser',
            language: 'typescript',
            code: [
              "await fetch('/api/lessons/12', {",
              "  method: 'DELETE',",
              '  headers: { Authorization: `Bearer ${token}` },',
              '})',
            ].join('\n'),
          },
          {
            type: 'timeline',
            items: [
              { title: 'POST /lessons', detail: '201 Created. The new lesson gets id 13, and a Location header points at it.' },
              { title: 'GET /lessons/13', detail: '200 OK. The client reads the lesson back to show it.' },
              { title: 'PATCH /lessons/13', detail: '200 OK. Only the title changes; the rest of the lesson stays.' },
              { title: 'PUT /lessons/13', detail: '200 OK. The full lesson from the editor replaces the old copy.' },
              { title: 'DELETE /lessons/13', detail: '204 No Content. The lesson is gone. Repeating the call gives 404.' },
            ],
          },
          {
            type: 'text',
            text: 'Responses get lost, so clients often repeat a request. Whether a repeat is harmless depends on the method. Try it below.',
          },
          {
            type: 'retry-demo',
          },
          {
            type: 'text',
            text: 'The method says what was asked. The status code says what happened.',
          },
          {
            type: 'table',
            headers: ['Situation', 'Response', 'What it means'],
            rows: [
              ['Deleted, nothing to send back', '204 No Content', 'DELETE worked and there is no body'],
              ['A new item was created', '201 Created', 'POST made a resource; Location says where'],
              ['The address has no such item', '404 Not Found', 'There is no lesson 12 to read or change'],
              ['The address does not accept this method', '405 Method Not Allowed', 'The response lists the methods it does accept'],
              ['The change clashes with current data', '409 Conflict', 'Two people edited the same lesson'],
            ],
          },
          {
            type: 'code',
            file: 'the same address, a method it does not accept',
            language: 'http',
            code: ['POST /lessons/12', '', '405 Method Not Allowed', 'Allow: GET, PUT, PATCH, DELETE'].join('\n'),
          },
          {
            type: 'section',
            title: 'Walkthrough',
          },
          {
            type: 'text',
            text: 'One lesson’s life, from creation to deletion. Press Next to write each call into the file.',
          },
          {
            type: 'walkthrough',
            steps: [
              {
                code: "const lesson = await fetch('/api/lessons/12')",
                result: '200 OK   { "id": 12, "title": "HTTP methods" }',
                note: 'GET reads the lesson. The server changes nothing.',
              },
              {
                code: "const created = await fetch('/api/lessons', {\n  method: 'POST',\n  body: JSON.stringify({ title: 'Verbs' }),\n})",
                result: '201 Created   Location: /api/lessons/13',
                note: 'POST creates a new item. The server picks its address.',
              },
              {
                code: "await fetch('/api/lessons/13', {\n  method: 'PATCH',\n  body: JSON.stringify({ title: 'HTTP verbs' }),\n})",
                result: '200 OK   only the title changed',
                note: 'PATCH sends just the field that changes.',
              },
              {
                code: "await fetch('/api/lessons/13', {\n  method: 'PUT',\n  body: JSON.stringify(fullLesson),\n})",
                result: '200 OK   the old copy is replaced',
                note: 'PUT sends the whole item. A field you leave out is lost.',
              },
              {
                code: "await fetch('/api/lessons/13', { method: 'DELETE' })",
                result: '204 No Content',
                note: 'DELETE removes the lesson. There is nothing to send back.',
              },
              {
                code: "await fetch('/api/lessons/13', { method: 'DELETE' })",
                result: '404 Not Found   already gone',
                note: 'Repeating DELETE is harmless. The server only reports the state.',
              },
            ],
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
