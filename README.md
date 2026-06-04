# AgentGate

AgentGate is an enterprise-grade multi-tenant SaaS product: the safety, approval, and audit layer for AI agents.

V1 focuses on a working demo flow where AI agent actions pass through a gateway, local safety engine, policy decision, approval inbox, and audit log before simulated execution.

## Tech Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- PostgreSQL
- Prisma ORM
- Zod
- npm

## Local Setup

Local setup is intentionally light while the foundation is being built.

1. Copy `.env.example` to `.env.local` and update secrets.
2. Start PostgreSQL with `docker compose up -d`.
3. Install dependencies with `npm install`.
4. Run Prisma setup with `npm run prisma:generate` and `npm run prisma:migrate`.
5. Start the app with `npm run dev`.

## V1 AI Policy

AgentGate V1 uses local deterministic TypeScript rules only. It does not call OpenAI, Anthropic, Gemini, or other paid AI APIs.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
