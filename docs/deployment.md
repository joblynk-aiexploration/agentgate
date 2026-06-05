# AgentGate Deployment Guide

AgentGate V1 is a Next.js App Router application backed by PostgreSQL and
Prisma. It does not require paid AI APIs or real external integrations.

## Required Environment Variables

Set these in every deployed environment:

```env
DATABASE_URL="postgresql://..."
APP_URL="https://your-agentgate-domain.example"
SESSION_SECRET="long-random-secret"
API_KEY_PEPPER="long-random-secret"
ENCRYPTION_KEY="32-byte-or-long-random-secret"
NODE_ENV="production"
```

Production rejects placeholder values from `.env.example`. Do not print these
values in logs, support tickets, screenshots, or deployment output.

Generate values with:

```bash
openssl rand -base64 32
openssl rand -hex 32
```

Changing `API_KEY_PEPPER` invalidates existing stored API key hashes.

## Local Docker Postgres

For local verification:

```bash
cp .env.example .env
docker compose up -d
npm install
npm run prisma:migrate
npm run prisma:seed
npm run dev
```

The demo seed is idempotent for local demos, but it creates demo users and a
documented demo API key. Do not run it for real production data.

## Docker Image

Build:

```bash
docker build -t agentgate:local .
```

Run:

```bash
docker run --rm -p 3000:3000 \
  -e DATABASE_URL="postgresql://postgres:postgres@host.docker.internal:5432/agentgate" \
  -e APP_URL="http://localhost:3000" \
  -e SESSION_SECRET="replace-with-a-real-random-secret" \
  -e API_KEY_PEPPER="replace-with-a-real-random-secret" \
  -e ENCRYPTION_KEY="replace-with-a-real-32-byte-key" \
  agentgate:local
```

The Dockerfile uses a build-only `AGENTGATE_SKIP_ENV_VALIDATION=1` flag so image
builds do not require production secrets. Runtime application code still validates
environment variables when the server starts and handles requests.

Run migrations before starting production traffic:

```bash
npx prisma migrate deploy
```

## Vercel

1. Import the GitHub repository into Vercel.
2. Provision PostgreSQL through Vercel Postgres, Neon, Supabase, Railway, or another provider.
3. Add all required environment variables in Project Settings.
4. Use the default build command:

```bash
npm run build
```

5. Run migrations from a trusted shell or CI step:

```bash
npx prisma migrate deploy
```

Do not run `npm run prisma:seed` for real production.

## Render

Create a Render Web Service.

Build command:

```bash
npm install && npx prisma generate && npm run build
```

Start command:

```bash
npm run start
```

Run migrations in Render Shell or a one-off job:

```bash
npx prisma migrate deploy
```

Set required env vars on the service. Use a Render PostgreSQL database or another
managed PostgreSQL URL.

## Railway, Fly.io, And Similar Hosts

Use either the Dockerfile or standard Node build.

Standard build:

```bash
npm install
npx prisma generate
npm run build
npx prisma migrate deploy
npm run start
```

For Fly.io, run migrations as a release command or one-off machine. For Railway,
run migrations as a deploy command or manually from a trusted shell.

## Production Readiness Checklist

- Set `DATABASE_URL` to production PostgreSQL.
- Set `APP_URL` to the deployed HTTPS URL.
- Set `SESSION_SECRET` to a long random value.
- Set `API_KEY_PEPPER` to a long random value and keep it stable.
- Set `ENCRYPTION_KEY` to a long random value.
- Set `NODE_ENV=production`.
- Run `npx prisma migrate deploy`.
- Create the first organization and user through onboarding or a controlled admin process.
- Do not use `ag_test_seed_support_refund_demo_key` in real deployments.
- Revoke or avoid all demo API keys before real customer use.
- Confirm V1 integrations are demo/simulated only.
- Confirm no paid AI API keys are configured or required.
