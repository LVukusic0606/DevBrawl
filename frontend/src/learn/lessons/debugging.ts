import type { Lesson } from '../content'
import { code, lesson } from './lesson'

export const DEBUGGING_LESSONS: Lesson[] = [
  lesson({
    id: 'reading-logs',
    title: 'Reading logs',
    intro:
      'Logs are the app’s diary. Each line says when something happened, how serious it was, which part of the system wrote it and what happened.',
    example: [
      code('api.log', [
        '10:42:11 INFO  auth     POST /api/login 200',
        '10:42:14 INFO  api      GET /api/profile 401',
        '10:42:14 WARN  auth     Authorization header missing',
      ]),
      {
        type: 'text',
        text: 'The 401 is the symptom. The warning right after it is the cause: the request arrived without a token.',
      },
    ],
    mistakes: [
      'Searching only for ERROR lines, when the cause is often a WARN just before.',
      'Logging without timestamps or request ids, so lines can’t be connected.',
    ],
    takeaway: 'Read logs in time order around the failure, and separate symptoms from causes.',
  }),
  lesson({
    id: 'bisect',
    title: 'Narrowing down with binary search',
    intro:
      'When something worked last week and is broken today, you don’t have to read every change. Test the middle commit and halve the search each time.',
    example: [
      {
        type: 'timeline',
        items: [
          { title: '64 commits to check', detail: 'The last good version and the first bad one are known.' },
          { title: 'Test commit 32', detail: 'Broken: the bug came in the first half.' },
          { title: 'Test commit 16', detail: 'Works: the bug is between 16 and 32.' },
          { title: 'About 6 steps later', detail: 'One commit is left. That is the one that broke it.' },
        ],
      },
    ],
    mistakes: [
      'Reading the changes one by one from the newest backwards.',
      'Testing with a flaky check, which sends the search the wrong way.',
    ],
    takeaway: 'Halving the search finds one bad commit in 1 000 in about 10 tests. git bisect does it for you.',
  }),
  lesson({
    id: 'breakpoints',
    title: 'Breakpoints and stepping',
    intro:
      'A debugger pauses the program on a chosen line, so you can see the real values instead of guessing them.',
    example: [
      {
        type: 'steps',
        steps: [
          'Set a breakpoint just before the code that misbehaves',
          'Run until it pauses there',
          'Inspect the variables',
          'Step one line at a time',
          'Stop at the first value that differs from what you expect',
        ],
      },
    ],
    mistakes: [
      'Stepping through everything from the start instead of pausing near the problem.',
      'Adding print statements and forgetting to remove them.',
    ],
    takeaway: 'Pause where the problem starts and compare each value with what you expected.',
  }),
  lesson({
    id: 'off-by-one',
    title: 'Off-by-one errors',
    intro:
      'Counting from 0 or 1, and stopping at < or <=, are easy to mix up. The result is a loop that skips the first item or reads one past the last.',
    example: [
      code('five rounds, numbered 0 to 4', [
        'for (let i = 0; i <= rounds.length; i++)   reads rounds[5], which does not exist',
        'for (let i = 0; i < rounds.length; i++)    reads rounds[0] to rounds[4]',
      ]),
    ],
    mistakes: [
      'Mixing 1-based line numbers with 0-based array indexes.',
      'Testing only with lists of one item, where the bug hides.',
    ],
    takeaway: 'Check the first and last item of every loop and every range.',
  }),
  lesson({
    id: 'null-values',
    title: 'Null and undefined values',
    intro:
      'A value that is missing where the code expects one causes some of the most common crashes. The crash happens where the value is used, not where it went missing.',
    example: [
      code('the crash and its source', [
        "TypeError: Cannot read properties of undefined (reading 'nickname')",
        '',
        'const winner = players.find((p) => p.id === winnerId)   undefined if not found',
        'show(winner.nickname)                                   crashes here',
      ]),
    ],
    mistakes: [
      'Fixing the crash line with a ?. without asking why the value was missing.',
      'Assuming an API always returns every field.',
    ],
    takeaway: 'Find where the value should have been set. Handle “not found” where it can happen.',
  }),
  lesson({
    id: 'race-conditions',
    title: 'Race conditions',
    intro:
      'When two operations run at the same time, the result can depend on which finishes first. The bug appears only sometimes, which makes it hard to catch.',
    example: [
      {
        type: 'timeline',
        items: [
          { title: 'Request A reads the score: 3', detail: 'Both requests start at the same moment.' },
          { title: 'Request B reads the score: 3', detail: 'B has not seen A’s change yet.' },
          { title: 'A writes 4', detail: 'A adds one point.' },
          { title: 'B writes 4', detail: 'B also adds one point to 3. One point is lost.' },
        ],
      },
    ],
    mistakes: [
      'Reading a value, changing it in code and writing it back as separate steps.',
      'Assuming a bug is fixed because it did not happen in ten tries.',
    ],
    takeaway: 'Make shared updates atomic, for example UPDATE scores SET points = points + 1, or use locks.',
  }),
  lesson({
    id: 'rubber-duck',
    title: 'Explaining the problem out loud',
    intro:
      'Describing a bug step by step, even to a rubber duck, forces you to check assumptions you skipped in your head.',
    example: [
      {
        type: 'steps',
        steps: [
          'Say what you expected to happen',
          'Say what actually happens',
          'Walk through the code line by line, out loud',
          'Notice the step you can’t explain',
          'Check that step first',
        ],
      },
    ],
    mistakes: [
      'Asking for help with “it doesn’t work” and no steps or error.',
      'Skipping the parts you are sure about, which is where the bug often is.',
    ],
    takeaway: 'If you can’t explain a step, that step is where to look.',
  }),
  lesson({
    id: 'regression-tests',
    title: 'Writing a test for the bug',
    intro:
      'A fixed bug can come back with the next change. A test that fails while the bug exists and passes after the fix keeps it from returning unnoticed.',
    example: [
      code('duel.test.ts', [
        "test('a draw gives no round point to either player', () => {",
        '  const result = scoreRound({ you: correct(1000), opponent: correct(1000) })',
        "  expect(result).toBe('draw')",
        '})',
      ]),
    ],
    mistakes: [
      'Writing the test after the fix without checking that it fails without it.',
      'Testing the implementation details instead of the behavior the user saw.',
    ],
    takeaway: 'Reproduce the bug in a test first. Then fix it and keep the test.',
  }),
]
