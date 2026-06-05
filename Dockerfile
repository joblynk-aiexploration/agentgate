# syntax=docker/dockerfile:1

FROM node:22-bookworm-slim AS base

WORKDIR /app

ENV NEXT_TELEMETRY_DISABLED=1

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates openssl \
  && rm -rf /var/lib/apt/lists/*

FROM base AS deps

COPY package.json package-lock.json ./
RUN npm ci

FROM deps AS builder

# Runtime env is still validated by AgentGate. This avoids requiring production
# secrets during an image build where no application server is started.
ENV AGENTGATE_SKIP_ENV_VALIDATION=1

COPY prisma ./prisma
COPY prisma.config.ts ./
COPY public ./public
COPY src ./src
COPY eslint.config.mjs next.config.ts postcss.config.mjs tsconfig.json ./

RUN npm run prisma:generate
RUN npm run build
RUN npm prune --omit=dev

FROM base AS runner

ENV NODE_ENV=production
ENV PORT=3000

COPY --from=builder /app/package.json /app/package-lock.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts
COPY --from=builder /app/src/generated ./src/generated
COPY --from=builder /app/next.config.ts ./next.config.ts

EXPOSE 3000

CMD ["npm", "run", "start"]
