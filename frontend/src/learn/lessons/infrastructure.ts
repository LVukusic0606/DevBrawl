import type { Lesson } from '../content'
import { code, lesson } from './lesson'

export const INFRASTRUCTURE_LESSONS: Lesson[] = [
  lesson({
    id: 'containers',
    title: 'Containers',
    intro:
      'A container packs an app together with everything it needs to run: the runtime, libraries and settings. It runs the same on a laptop and on a server.',
    example: [
      code('Dockerfile', [
        'FROM node:22-alpine      start from a small image with Node',
        'WORKDIR /app',
        'COPY package*.json ./',
        'RUN npm ci               install exact dependencies',
        'COPY . .',
        'CMD ["node", "server.js"]',
      ]),
    ],
    mistakes: [
      'Saving data inside the container, where it is lost when the container is replaced.',
      'Baking secrets into the image.',
    ],
    takeaway: 'A container is a repeatable package for running an app. Keep data and secrets outside it.',
  }),
  lesson({
    id: 'images-registries',
    title: 'Images and registries',
    intro:
      'An image is the built, unchangeable package. A registry stores images, so every environment can pull exactly the same one.',
    example: [
      {
        type: 'steps',
        steps: [
          'CI builds the image once',
          'It is tagged with the commit, e.g. devbrawl-api:4f2a9c',
          'CI pushes it to the registry',
          'Staging pulls and runs that tag',
          'Production later pulls the very same tag',
        ],
      },
    ],
    mistakes: [
      'Deploying the tag latest, so nobody knows which version is running.',
      'Rebuilding the image for production instead of reusing the tested one.',
    ],
    takeaway: 'Build once, tag by commit, and promote the same image from staging to production.',
  }),
  lesson({
    id: 'orchestration',
    title: 'Orchestration',
    intro:
      'With many containers on many machines, someone has to start them, restart them and spread them out. An orchestrator such as Kubernetes does that job.',
    example: [
      {
        type: 'table',
        headers: ['You declare', 'The orchestrator does'],
        rows: [
          ['Run 3 copies of the API', 'Starts 3 and replaces any that crash'],
          ['Each needs 512 MB of memory', 'Places them on machines with room'],
          ['Ship version 4f2a9c', 'Replaces copies one by one with no downtime'],
        ],
      },
    ],
    mistakes: [
      'Reaching for an orchestrator for one small app on one server.',
      'Not setting health checks, so it can’t tell a stuck container from a healthy one.',
    ],
    takeaway: 'You describe the state you want; the orchestrator keeps the system in that state.',
  }),
  lesson({
    id: 'infrastructure-as-code',
    title: 'Infrastructure as code',
    intro:
      'Servers, databases and networks can be described in files instead of clicked together by hand. The files are reviewed and versioned like any other code.',
    example: [
      code('database.tf', [
        'resource "postgres_database" "devbrawl" {',
        '  name     = "devbrawl"',
        '  size     = "small"',
        '  backups  = "daily"',
        '}',
      ]),
    ],
    mistakes: [
      'Fixing production by hand, so it drifts from what the files describe.',
      'Applying changes without reviewing the plan of what will change.',
    ],
    takeaway: 'Describe infrastructure in code, review it, and change it only through the code.',
  }),
  lesson({
    id: 'monitoring',
    title: 'Monitoring and alerts',
    intro:
      'Monitoring answers “is it working right now?” before users have to tell you. A few well-chosen numbers say a lot about a service’s health.',
    example: [
      {
        type: 'table',
        headers: ['Signal', 'Question it answers'],
        rows: [
          ['Request rate', 'How busy is it?'],
          ['Error rate', 'How many requests fail?'],
          ['Latency', 'How long do users wait?'],
          ['Saturation', 'How close is it to its limits?'],
        ],
      },
    ],
    mistakes: [
      'Alerting on everything, so real alerts get ignored.',
      'Measuring averages only, which hide the slow requests users feel.',
    ],
    takeaway: 'Watch rate, errors, latency and saturation, and alert only on what needs a person.',
  }),
  lesson({
    id: 'dns',
    title: 'How DNS finds a server',
    intro:
      'People type names like devbrawl.io; computers connect to addresses like 203.0.113.7. DNS translates one into the other.',
    example: [
      {
        type: 'steps',
        steps: [
          'The browser asks a resolver for devbrawl.io',
          'The resolver asks who handles .io',
          'Then it asks who handles devbrawl.io',
          'That server answers with the address',
          'The answer is cached for its TTL',
        ],
      },
    ],
    mistakes: [
      'Changing a DNS record and expecting everyone to see it instantly despite a long TTL.',
      'Forgetting to renew the domain.',
    ],
    takeaway: 'DNS maps names to addresses, and caches mean changes spread slowly. Lower the TTL before a planned move.',
  }),
  lesson({
    id: 'reverse-proxy',
    title: 'Reverse proxies',
    intro:
      'A reverse proxy such as nginx receives every request first and passes it on to the right app. It handles shared jobs so the apps don’t have to.',
    example: [
      code('one entry point, several apps', [
        'devbrawl.io/          → frontend',
        'devbrawl.io/api/      → API',
        'devbrawl.io/hubs/     → API (WebSockets)',
        '',
        'the proxy also: terminates HTTPS, compresses, limits body size',
      ]),
    ],
    mistakes: [
      'Forgetting the proxy has its own limits, such as the maximum upload size.',
      'Not forwarding WebSocket upgrades, so live features fail behind the proxy.',
    ],
    takeaway: 'The proxy is part of the request path. When something fails between client and app, check it too.',
  }),
  lesson({
    id: 'rollbacks',
    title: 'Rolling back a deploy',
    intro:
      'Sometimes a release breaks something despite the tests. The fastest fix is often to go back to the last version that worked, then investigate calmly.',
    example: [
      {
        type: 'timeline',
        items: [
          { title: '14:00 Deploy 4f2a9c', detail: 'The new version goes live.' },
          { title: '14:06 Error rate jumps', detail: 'Monitoring alerts the team.' },
          { title: '14:08 Roll back to 9e1b07', detail: 'The previous image is deployed again.' },
          { title: '14:10 Errors back to normal', detail: 'Now the team finds the cause without pressure.' },
        ],
      },
    ],
    mistakes: [
      'Database migrations that can’t run against the old version, which blocks the rollback.',
      'Debugging in production while users keep hitting the bug.',
    ],
    takeaway: 'Keep every release easy to undo. Roll back first, then find the cause.',
  }),
]
