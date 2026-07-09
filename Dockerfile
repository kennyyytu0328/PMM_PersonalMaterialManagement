FROM node:20-alpine AS base

# Install dependencies
FROM base AS deps
RUN apk add --no-cache libc6-compat python3 make g++
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN corepack enable pnpm && pnpm install --frozen-lockfile
# pnpm's node_modules/bcryptjs is a symlink into the .pnpm content store, which
# won't exist in the runner stage. Dereference it into a standalone real folder
# here so the runner can COPY a complete package without following pnpm's layout.
RUN cp -rL /app/node_modules/bcryptjs /app/bcryptjs-resolved

# Build
FROM base AS builder
WORKDIR /app
ARG NEXT_PUBLIC_BASE_PATH=
ENV NEXT_PUBLIC_BASE_PATH=$NEXT_PUBLIC_BASE_PATH
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN corepack enable pnpm && pnpm db:generate && pnpm build

# Production
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ARG NEXT_PUBLIC_BASE_PATH=
# Server-side process.env reads (e.g. src/lib/auth.config.ts) need this at
# container runtime, not just baked into the client bundle at build time.
ENV NEXT_PUBLIC_BASE_PATH=$NEXT_PUBLIC_BASE_PATH
# tzdata so TZ=Asia/Taipei (set in compose) takes effect on musl/alpine
RUN apk add --no-cache tzdata
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs
RUN mkdir -p /app/data /app/scripts && chown nextjs:nodejs /app/data

# Next.js standalone output
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# bcryptjs is inlined into the Next bundles and absent from the standalone
# node_modules, but seed.mjs (plain node) needs it at container start
COPY --from=deps --chown=nextjs:nodejs /app/bcryptjs-resolved ./node_modules/bcryptjs

# Migration SQL files (read by migrate.mjs at runtime)
COPY --from=builder /app/src/db/migrations ./src/db/migrations

# Standalone scripts that run with plain node (no tsx / drizzle-kit needed)
COPY scripts/migrate.mjs ./scripts/migrate.mjs
COPY scripts/seed.mjs ./scripts/seed.mjs
COPY scripts/docker-entrypoint.sh ./scripts/docker-entrypoint.sh
RUN chmod +x /app/scripts/docker-entrypoint.sh

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

ENTRYPOINT ["/app/scripts/docker-entrypoint.sh"]
