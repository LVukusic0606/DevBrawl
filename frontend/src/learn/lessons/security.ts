import type { Lesson } from '../content'
import { code, lesson } from './lesson'

export const SECURITY_LESSONS: Lesson[] = [
  lesson({
    id: 'sql-injection',
    title: 'SQL injection',
    intro:
      'When user input is glued into a SQL string, the input can change the query itself. An attacker can then read or delete data they should never reach.',
    example: [
      code('the same search, unsafe and safe', [
        'unsafe:  "SELECT * FROM users WHERE nickname = \'" + input + "\'"',
        "         input = x' OR '1'='1   → returns every user",
        '',
        'safe:    "SELECT * FROM users WHERE nickname = @nickname"',
        '         the input is sent as a value, never as SQL',
      ]),
    ],
    mistakes: [
      'Escaping quotes by hand instead of using parameters.',
      'Trusting input because it comes from your own frontend.',
    ],
    takeaway: 'Always pass user input as query parameters. Never build SQL out of strings.',
  }),
  lesson({
    id: 'xss',
    title: 'Cross-site scripting (XSS)',
    intro:
      'XSS happens when a page shows user content as HTML, so a script hidden in it runs in other users’ browsers with their session.',
    example: [
      code('a comment that runs code', [
        'comment = <img src=x onerror="steal(document.cookie)">',
        '',
        'unsafe:  element.innerHTML = comment     the script runs',
        'safe:    element.textContent = comment   shown as plain text',
      ]),
    ],
    mistakes: [
      'Rendering user content with innerHTML or dangerouslySetInnerHTML.',
      'Sanitizing on input only, then reusing the data somewhere it is not escaped.',
    ],
    takeaway: 'Treat user content as text. Escape it where it is shown, every time.',
  }),
  lesson({
    id: 'csrf',
    title: 'Cross-site request forgery (CSRF)',
    intro:
      'Browsers send cookies automatically. A malicious site can make your browser send a request to an app you are logged in to, and the cookie makes it look like you.',
    example: [
      {
        type: 'steps',
        steps: [
          'You are logged in to bank.example',
          'You open a malicious page',
          'It submits a hidden form to bank.example/transfer',
          'The browser adds your session cookie',
          'Without protection, the bank accepts it',
        ],
      },
    ],
    mistakes: [
      'Changing data on GET requests, which any image tag can trigger.',
      'Relying on cookies without SameSite or a CSRF token.',
    ],
    takeaway: 'Use SameSite cookies, CSRF tokens or bearer tokens in headers, which other sites cannot add.',
  }),
  lesson({
    id: 'jwt',
    title: 'How JWT access tokens work',
    intro:
      'A JWT is a signed note from the server: “this is user 42 until 14:30”. The server can check the signature without looking anything up.',
    example: [
      code('the three parts of a token', [
        'header.payload.signature',
        '',
        'header:     { "alg": "HS256" }',
        'payload:    { "sub": "42", "exp": 1792860000 }   readable by anyone',
        'signature:  proves the server issued it unchanged',
      ]),
    ],
    mistakes: [
      'Putting secrets in the payload, which is only encoded, not encrypted.',
      'Issuing tokens that never expire.',
    ],
    takeaway: 'A JWT proves who issued it and that it was not changed. Keep it short-lived and keep secrets out of it.',
  }),
  lesson({
    id: 'https',
    title: 'HTTPS and TLS',
    intro:
      'Plain HTTP travels as readable text, so anyone on the network can read or change it. HTTPS wraps it in TLS, which encrypts it and proves the server is who it claims to be.',
    example: [
      {
        type: 'steps',
        steps: [
          'The browser connects to devbrawl.io',
          'The server shows its certificate',
          'The browser checks it was issued for that domain',
          'Both agree on keys for this session',
          'Everything after that is encrypted',
        ],
      },
    ],
    mistakes: [
      'Serving the login page over HTTPS but the API over plain HTTP.',
      'Telling users to click through certificate warnings.',
    ],
    takeaway: 'Use HTTPS everywhere. It protects both the content and the identity of the server.',
  }),
  lesson({
    id: 'least-privilege',
    title: 'Least privilege',
    intro:
      'Every user, service and key should have only the access it needs. When one of them is compromised, the damage stays small.',
    example: [
      {
        type: 'table',
        headers: ['Who', 'Needs', 'Should not have'],
        rows: [
          ['Duel service', 'Read and write duels', 'Access to password hashes'],
          ['CI pipeline', 'Deploy to staging', 'Admin access to production'],
          ['Support staff', 'View accounts', 'Delete accounts'],
        ],
      },
    ],
    mistakes: [
      'Letting the app connect to the database as a superuser.',
      'Sharing one admin key between all services.',
    ],
    takeaway: 'Grant the smallest access that works, and give each part its own credentials.',
  }),
  lesson({
    id: 'secrets',
    title: 'Keeping secrets out of code',
    intro:
      'Repositories get copied, shared and published. A key committed once stays in the history even after the line is deleted.',
    example: [
      code('where secrets belong', [
        '.gitignore        .env          never committed',
        '.env              JWT_SECRET=...',
        '.env.example      JWT_SECRET=   committed, without values',
      ]),
    ],
    mistakes: [
      'Committing a key and “fixing” it by deleting the line.',
      'Printing configuration, secrets included, into build logs.',
    ],
    takeaway: 'Load secrets from the environment. If one was ever committed, rotate it.',
  }),
  lesson({
    id: 'input-validation',
    title: 'Validate input on the server',
    intro:
      'Frontend checks help users, but anyone can send a request without the frontend. The server must check every value it receives.',
    example: [
      code('rules for a signup request', [
        'nickname   3 to 20 letters, numbers or underscores',
        'email      a valid address, not already used',
        'password   at least 8 characters',
        '',
        'anything else → 400 Bad Request with the reason',
      ]),
    ],
    mistakes: [
      'Validating only in the browser.',
      'Accepting extra fields and saving them, such as "isAdmin": true.',
    ],
    takeaway: 'Check type, size and allowed values on the server, and accept only the fields you expect.',
  }),
]
