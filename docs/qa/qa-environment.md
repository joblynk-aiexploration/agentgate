# QA Environment

## Local Services

| Service | URL | Status During QA |
| --- | --- | --- |
| AgentGate | `http://localhost:3001` | Running through `npm run dev -- -p 3001` |
| Northstar commerce demo | `http://localhost:3004` | Running through `npm run commerce:dev` |
| Postgres | `localhost:55432` | Docker container `agentgate-postgres` running |

## Database

The local `.env` uses `DATABASE_URL` pointing to Postgres on port `55432`. After starting the Docker container, Prisma migration status was in sync and demo reset/check passed.

## Known Environment Notes

- `npm` and `npx` required the Node tool path to be exported in this shell.
- AgentGate local QA now defaults to `localhost`; the Next.js dev configuration also allows `127.0.0.1` for local browser automation.
- Commerce build emitted a Next.js workspace-root warning because multiple lockfiles are present.
- Playwright/browser tests were run against local servers, not a hosted deployment.
