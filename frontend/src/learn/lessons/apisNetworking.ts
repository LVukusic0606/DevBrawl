import type { Lesson } from '../content'
import { code, lesson } from './lesson'

export const API_LESSONS: Lesson[] = [
  lesson({
    id: 'status-codes',
    title: 'Understanding HTTP status codes',
    intro:
      'Every response starts with a three-digit status code. The first digit tells the client what kind of answer it got before it reads anything else.',
    example: [
      {
        type: 'table',
        headers: ['Range', 'Meaning', 'Examples'],
        rows: [
          ['2xx', 'It worked', '200 OK, 201 Created, 204 No Content'],
          ['3xx', 'Look somewhere else', '301 Moved Permanently, 304 Not Modified'],
          ['4xx', 'The client made a mistake', '400 Bad Request, 404 Not Found, 409 Conflict'],
          ['5xx', 'The server failed', '500 Internal Server Error, 503 Service Unavailable'],
        ],
      },
      {
        type: 'text',
        text: 'The range decides what the client should do next. A 4xx means fix the request; a 5xx means the same request may work later.',
      },
    ],
    mistakes: [
      'Returning 200 with an error message in the body, so clients and monitoring think everything worked.',
      'Using 500 for invalid input, which blames the server for the client’s mistake.',
      'Retrying 4xx responses that will fail the same way every time.',
    ],
    takeaway: 'The status code is the first and most important part of the answer. Pick the one that tells the client what to do next.',
  }),
  lesson({
    id: 'headers',
    title: 'HTTP headers',
    intro:
      'Headers are key-value pairs that travel with a request or a response. They carry information about the message rather than the message itself.',
    example: [
      code('a request and its response', [
        'GET /api/lessons/12',
        'Authorization: Bearer eyJhbGciOi...   who is asking',
        'Accept: application/json             what format the client wants',
        '',
        '200 OK',
        'Content-Type: application/json       what format the body is in',
        'Cache-Control: max-age=60            how long it may be reused',
      ]),
    ],
    mistakes: [
      'Sending JSON without a Content-Type header, so the server cannot parse it.',
      'Putting secrets in custom headers that end up in logs.',
    ],
    takeaway: 'The body is the content; headers are the instructions for handling it.',
  }),
  lesson({
    id: 'rest',
    title: 'REST API fundamentals',
    intro:
      'REST organizes an API around resources: things with an address, such as a lesson or a user. The method says what to do with the resource.',
    example: [
      code('one resource, many actions', [
        'GET     /lessons          list lessons',
        'POST    /lessons          create a lesson',
        'GET     /lessons/12       read lesson 12',
        'PATCH   /lessons/12       change part of lesson 12',
        'DELETE  /lessons/12       remove lesson 12',
        'GET     /lessons/12/quiz  a resource that belongs to lesson 12',
      ]),
    ],
    mistakes: [
      'Putting verbs in the address, such as /getLesson or /deleteLesson, instead of using the method.',
      'Returning a different shape for the same resource from different endpoints.',
    ],
    takeaway: 'Addresses name things, methods name actions. Keep both predictable and clients can guess the rest.',
  }),
  lesson({
    id: 'timeouts',
    title: 'Timeouts and network failures',
    intro:
      'The network is slow or broken more often than it seems. A request without a timeout can wait forever and hold resources the whole time.',
    example: [
      {
        type: 'steps',
        steps: [
          'Send the request with a timeout',
          'No answer in time: stop waiting',
          'Wait a little, then retry',
          'Wait longer before each next retry',
          'Give up after a few tries and show an error',
        ],
      },
    ],
    mistakes: [
      'Calling other services without a timeout.',
      'Retrying immediately and in a tight loop, which overloads a server that is already struggling.',
      'Retrying requests that are not safe to repeat, such as a payment.',
    ],
    takeaway: 'Every network call needs a timeout. Retry with growing pauses, and only when repeating is safe.',
  }),
  lesson({
    id: 'rate-limiting',
    title: 'Rate limiting',
    intro:
      'A rate limit caps how many requests a client may send in a time window. It protects the server from overload and from abuse such as password guessing.',
    example: [
      code('the 101st request in one minute', [
        'POST /api/auth/login',
        '',
        '429 Too Many Requests',
        'Retry-After: 30',
        '{ "title": "Too many login attempts. Try again in 30 seconds." }',
      ]),
    ],
    mistakes: [
      'Limiting only by IP address, so many users behind one network block each other.',
      'Not telling the client when it may try again.',
    ],
    takeaway: 'Answer with 429 and Retry-After, and let clients slow down instead of failing blindly.',
  }),
  lesson({
    id: 'http-caching',
    title: 'Caching and HTTP cache headers',
    intro:
      'HTTP can tell browsers and proxies how long a response stays fresh. A fresh response is reused without asking the server again.',
    example: [
      code('first request, then a revalidation', [
        '200 OK',
        'Cache-Control: max-age=300',
        'ETag: "v42"',
        '',
        'GET /api/categories',
        'If-None-Match: "v42"',
        '304 Not Modified          nothing changed, reuse the copy',
      ]),
    ],
    mistakes: [
      'Caching responses that contain one user’s private data in a shared cache.',
      'Setting a long max-age on data that changes often, so users see stale results.',
    ],
    takeaway: 'Cache-Control decides how long a copy is fresh; ETag lets the client ask cheaply whether it changed.',
  }),
  lesson({
    id: 'cors',
    title: 'CORS: why the browser blocks a request',
    intro:
      'Browsers block a page from reading responses from another origin unless that server allows it. CORS is how the server says which origins are allowed.',
    example: [
      {
        type: 'steps',
        steps: [
          'app.devbrawl.io calls api.devbrawl.io',
          'The browser sends a preflight OPTIONS request',
          'The API answers with Access-Control-Allow-Origin',
          'The browser checks the origin is allowed',
          'Only then the real request goes out',
        ],
      },
    ],
    mistakes: [
      'Allowing every origin with * on an API that uses cookies.',
      'Trying to fix CORS in the frontend; only the server can allow an origin.',
    ],
    takeaway: 'CORS is enforced by the browser and configured on the server. Allow exactly the origins you trust.',
  }),
  lesson({
    id: 'polling-websockets',
    title: 'Polling vs. WebSockets',
    intro:
      'Some data changes while the user watches, such as a duel score. The client can ask again and again, or keep one connection open and let the server push.',
    example: [
      {
        type: 'table',
        headers: ['Approach', 'How it works', 'Good for'],
        rows: [
          ['Polling', 'The client asks every few seconds', 'Data that changes rarely'],
          ['Long polling', 'The server holds the request until there is news', 'Simple near-live updates'],
          ['WebSockets', 'One open connection, messages both ways', 'Live games, chat, duels'],
        ],
      },
    ],
    mistakes: [
      'Polling every second for data that changes once an hour.',
      'Forgetting to reconnect when a WebSocket drops.',
    ],
    takeaway: 'Poll when updates are rare; keep a connection open when both sides need to talk in real time.',
  }),
]
