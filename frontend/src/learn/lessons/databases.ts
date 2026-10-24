import type { Lesson } from '../content'
import { code, lesson } from './lesson'

export const DATABASE_LESSONS: Lesson[] = [
  lesson({
    id: 'joins',
    title: 'SQL joins',
    intro:
      'Data that belongs together often lives in different tables. A join combines rows from two tables where a key matches, so one query can answer one question.',
    example: [
      code('duels with the winner’s nickname', [
        'SELECT duels.id, users.nickname AS winner',
        'FROM duels',
        'JOIN users ON users.id = duels.winner_id',
      ]),
      {
        type: 'table',
        headers: ['Join', 'Keeps'],
        rows: [
          ['INNER JOIN', 'Only rows that match in both tables'],
          ['LEFT JOIN', 'Every row from the left table, matched or not'],
        ],
      },
    ],
    mistakes: [
      'Forgetting the ON condition, which pairs every row with every other row.',
      'Using an inner join when rows without a match must still show up.',
    ],
    takeaway: 'Joins rebuild the full picture from tables that each store one kind of thing.',
  }),
  lesson({
    id: 'indexes',
    title: 'Database indexes',
    intro:
      'Without an index, the database reads every row to find a match. An index is a sorted lookup structure that jumps straight to the right rows.',
    example: [
      {
        type: 'table',
        headers: ['Query on 1 000 000 users', 'Without an index', 'With an index on email'],
        rows: [['WHERE email = ...', 'Reads every row', 'Reads a handful of entries']],
      },
      code('adding one', ['CREATE INDEX ix_users_email ON users (email);']),
    ],
    mistakes: [
      'Indexing every column, which slows down every insert and update.',
      'Adding an index but filtering with a function on the column, so the index is not used.',
    ],
    takeaway: 'Index the columns you search and join on. Each index speeds up reads and costs a little on writes.',
  }),
  lesson({
    id: 'transactions',
    title: 'Transactions and ACID',
    intro:
      'A transaction groups several changes so they happen together or not at all. ACID names the guarantees a transaction gives.',
    example: [
      {
        type: 'table',
        headers: ['Letter', 'Guarantee'],
        rows: [
          ['Atomic', 'All changes apply, or none do'],
          ['Consistent', 'Rules such as keys and constraints still hold afterwards'],
          ['Isolated', 'Running transactions do not see each other’s half-done work'],
          ['Durable', 'Once committed, the change survives a crash'],
        ],
      },
    ],
    mistakes: [
      'Running related updates as separate statements, so a crash in between leaves half a change.',
      'Keeping a transaction open while waiting for a user or a network call.',
    ],
    takeaway: 'Wrap changes that must stay together in one short transaction.',
  }),
  lesson({
    id: 'normalization',
    title: 'Database normalization',
    intro:
      'Normalization removes repeated data by splitting it into tables that each describe one thing. Each fact then lives in exactly one place.',
    example: [
      code('before and after', [
        'before:  duels(id, winner_nickname, winner_email, loser_nickname, ...)',
        '',
        'after:   users(id, nickname, email)',
        '         duels(id, winner_id → users.id, loser_id → users.id)',
      ]),
    ],
    mistakes: [
      'Copying user details into every row that mentions the user.',
      'Splitting tables so far that every simple read needs many joins.',
    ],
    takeaway: 'Store each fact once and link to it. Denormalize later only where a measured read needs it.',
  }),
  lesson({
    id: 'n-plus-one',
    title: 'The N+1 query problem',
    intro:
      'Loading a list and then one extra query per item turns one request into hundreds of database round trips. It is easy to write and slow to run.',
    example: [
      code('one query for the list, N for the details', [
        'duels = db.query("SELECT * FROM duels LIMIT 50")      1 query',
        'for duel in duels:',
        '    duel.winner = db.query("SELECT * FROM users",       50 queries',
        '                           where id = duel.winner_id)',
      ]),
      {
        type: 'text',
        text: 'The fix loads the related rows in one go: a join, or one query with WHERE id IN (...) for all the ids.',
      },
    ],
    mistakes: [
      'Not noticing because it is fast with ten rows in development.',
      'Lazy-loading relations inside a loop in an ORM.',
    ],
    takeaway: 'Count queries per request. Load related data in bulk, not one row at a time.',
  }),
  lesson({
    id: 'connection-pools',
    title: 'Database connection pools',
    intro:
      'Opening a database connection is slow. A pool keeps a few connections open and lends them to requests, which give them back when done.',
    example: [
      {
        type: 'steps',
        steps: [
          'A request needs the database',
          'It borrows a free connection from the pool',
          'It runs its queries',
          'It returns the connection',
          'If none are free, the request waits for one',
        ],
      },
    ],
    mistakes: [
      'Forgetting to return a connection, so the pool slowly runs dry.',
      'Making the pool bigger than the database can handle.',
    ],
    takeaway: 'Borrow late, return early. A leaking pool looks like the database suddenly hanging.',
  }),
  lesson({
    id: 'migrations',
    title: 'Schema migrations',
    intro:
      'The database structure changes as the app grows. Migrations are small, ordered scripts that move every database from one version to the next in the same way.',
    example: [
      code('Data/Migrations/', [
        'Data/Migrations/',
        '├── 20261024143436_AddAuth.cs',
        '├── 20261024154840_AddCategories.cs',
        '└── 20261024163755_AddDuels.cs',
      ]),
    ],
    mistakes: [
      'Changing the production schema by hand, so it no longer matches the migrations.',
      'Editing a migration that already ran somewhere instead of adding a new one.',
    ],
    takeaway: 'Every schema change is a new migration, applied in order, the same way everywhere.',
  }),
  lesson({
    id: 'relational-vs-document',
    title: 'Relational vs. document databases',
    intro:
      'Relational databases store rows in tables with a fixed shape. Document databases store whole objects, such as JSON, that can differ from each other.',
    example: [
      {
        type: 'table',
        headers: ['', 'Relational', 'Document'],
        rows: [
          ['Shape', 'Fixed columns', 'Flexible per document'],
          ['Links between data', 'Joins and foreign keys', 'Embedded or looked up by id'],
          ['Good fit', 'Connected data that must stay consistent', 'Self-contained records read as a whole'],
        ],
      },
    ],
    mistakes: [
      'Choosing a document store for highly connected data, then rebuilding joins in code.',
      'Assuming “schemaless” means the data has no shape to maintain.',
    ],
    takeaway: 'Pick the model that matches how the data is connected and read.',
  }),
]
