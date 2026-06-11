FROM node:24-slim AS base
RUN corepack enable && corepack prepare pnpm@latest --activate

# ── Stage 1: Install deps ───────────────────────────────────
FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --ignore-scripts && pnpm rebuild esbuild

# ── Stage 2: Build ──────────────────────────────────────────
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm build

# ── Stage 3: Migrator (drizzle-kit + migration files only) ──
FROM base AS migrator
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY drizzle.config.ts ./
COPY drizzle/ ./drizzle/
COPY src/db/ ./src/db/
COPY package.json ./

# ── Stage 4: Runtime ────────────────────────────────────────
FROM node:24-slim AS runner
WORKDIR /app
COPY --from=builder /app/.output ./.output
EXPOSE 3000
CMD ["node", ".output/server/index.mjs"]
