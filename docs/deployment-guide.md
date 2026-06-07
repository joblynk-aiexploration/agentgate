# AgentGate Hosted Preview Deployment Guide

AgentGate V1 is a Next.js App Router application with PostgreSQL and Prisma. It
does not use paid AI APIs, does not call real external tools, and does not
implement live Stripe billing in V1.

This guide is for getting a hosted preview that you can open in a normal browser.
Do not commit secrets. Add secrets only through the hosting provider environment
variable UI or a trusted secrets manager.

## Required Production Environment Variables

Set these for every hosted deployment:

```env
DATABASE_URL="postgresql://..."
APP_URL="https://your-agentgate-preview.example"
SESSION_SECRET="long-random-secret"
API_KEY_PEPPER="long-random-secret"
ENCRYPTION_KEY="long-random-secret"
NODE_ENV="production"
```

Generate secrets with:

```bash
openssl rand -base64 32
openssl rand -hex 32
```

Warnings:

- Do not use placeholder secrets in production.
- Do not use `ag_test_seed_support_refund_demo_key` for real production.
- Do not run the demo seed on real customer production data.
- Changing `API_KEY_PEPPER` invalidates existing stored API key hashes.
- `DATABASE_URL` must point to PostgreSQL. Vercel, Render, and Railway do not
  magically provide a database unless you create or attach one.

## Option A: Vercel + Hosted Postgres

Vercel is the easiest fit for the Next.js frontend and API routes. Vercel does
not include PostgreSQL by default, so create or attach a hosted Postgres database
first.

Recommended database options:

- Vercel Postgres
- Neon
- Supabase
- Railway Postgres
- Render Postgres

Steps:

1. In Vercel, click **Add New Project** and import
   `joblynk-aiexploration/agentgate`.
2. Select the default Next.js framework settings.
3. Add environment variables:
   - `DATABASE_URL`
   - `APP_URL`
   - `SESSION_SECRET`
   - `API_KEY_PEPPER`
   - `ENCRYPTION_KEY`
   - `NODE_ENV=production`
4. Set `APP_URL` to the final Vercel deployment URL after the first deployment,
   then redeploy if needed.
5. Build command:

```bash
npm run build
```

6. Install command:

```bash
npm ci
```

7. Run migrations from a trusted local shell, Vercel CLI environment, or CI job:

```bash
npm run db:deploy
```

8. For a hosted demo preview only, seed demo data after migrations:

```bash
npm run db:seed
```

Do not run `npm run db:seed` on a real customer production database.

After deployment:

1. Open the Vercel URL.
2. Log in with demo credentials only if you seeded demo data.
3. Open `/developer/agent-lab`.
4. Run the large-refund scenario.
5. Confirm it creates a pending approval.

## Option B: Render Or Railway Full-Stack App + Postgres

Render and Railway can host both the web app and a managed Postgres database in
one project. This is often simpler for previews that need a database.

Create:

- One web/app service from this GitHub repo.
- One PostgreSQL service.
- A `DATABASE_URL` environment variable pointing to the Postgres service.

Build command:

```bash
npm ci && npm run build
```

Start command:

```bash
npm run start
```

Environment variables:

- `DATABASE_URL`
- `APP_URL`
- `SESSION_SECRET`
- `API_KEY_PEPPER`
- `ENCRYPTION_KEY`
- `NODE_ENV=production`

Migration command:

```bash
npm run db:deploy
```

Demo seed command, for preview databases only:

```bash
npm run db:seed
```

Provider notes:

- Render: run migrations from Render Shell or a one-off job before opening the
  app to users.
- Railway: run migrations from the service shell, deploy command, or a one-off
  command after the Postgres service is available.
- If using Docker deployment, the existing `Dockerfile` builds the Next.js app,
  generates Prisma Client, and runs `npm run start`. Runtime secrets still must
  be supplied by the hosting provider.

## Option C: Local Browser Demo

Use this when you want to run AgentGate on your own machine instead of Codex
localhost.

Commands:

```bash
cp .env.example .env
npm install
docker compose up -d
npm run prisma:migrate
npm run demo:reset
npm run demo:check
npm run dev -- -p 3001
```

Open:

```text
http://localhost:3001
```

Login:

- Owner: `owner@agentgate.dev` / `Password123!`
- Reviewer: `reviewer@agentgate.dev` / `Password123!`
- Auditor: `auditor@agentgate.dev` / `Password123!`
- Developer: `developer@agentgate.dev` / `Password123!`

Test Agent Lab:

1. Log in as owner.
2. Open `/developer/agent-lab`.
3. Run `large-refund`.
4. Confirm `REQUIRE_APPROVAL`.
5. Log in as reviewer.
6. Approve the approval.
7. Open Audit Logs and confirm the approval trail.

## Hosted Preview Checklist

Before clicking deploy:

- Create or attach hosted PostgreSQL.
- Add all required environment variables.
- Generate real random secrets.
- Confirm `NODE_ENV=production`.
- Confirm `APP_URL` matches the hosted HTTPS URL.

Provider UI:

- Vercel: import GitHub repo, keep Next.js defaults, add env vars in Project
  Settings, attach hosted Postgres, deploy.
- Render: create Web Service, create Postgres service, connect `DATABASE_URL`,
  set build/start commands, deploy.
- Railway: create project from GitHub repo, add Postgres, set env vars, deploy.

After deploy:

```bash
npm run db:deploy
```

For a hosted demo preview only:

```bash
npm run db:seed
```

Then:

1. Open the hosted URL.
2. Login as `owner@agentgate.dev` if demo seed was run.
3. Open Dashboard.
4. Open Developer -> Agent Lab.
5. Run `large-refund`.
6. Confirm `REQUIRE_APPROVAL`.
7. Login as reviewer.
8. Approve the request.
9. Open Audit Logs.

## What Not To Do

- Do not commit `.env` or production secrets.
- Do not use the local demo API key in real production.
- Do not run demo seed against real customer production data.
- Do not add OpenAI, Anthropic, Gemini, or paid AI API keys for V1.
- Do not configure real Stripe, Gmail, Slack, Postgres business writes, or
  external webhook side effects for the V1 demo.
