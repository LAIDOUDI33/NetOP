# ──────────────────────────────────────────────
# NetOptima Algérie — Multi-stage Docker build
# ──────────────────────────────────────────────

# ---------- Stage 1: Dependencies ----------
FROM oven/bun:1 AS deps
WORKDIR /app
COPY package.json bun.lockb* ./
RUN bun install --frozen-lockfile

# ---------- Stage 2: Build ----------
FROM oven/bun:1 AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma client
RUN bunx prisma generate

# Build Next.js (standalone output)
# ignoreBuildErrors is false → build will fail on type errors (intentional)
ENV NEXT_TELEMETRY_DISABLED=1
RUN bun run build

# ---------- Stage 3: Production ----------
FROM oven/bun:1 AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy standalone build
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static    ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public             ./public

# Copy Prisma schema for migrations
COPY --from=builder --chown=nextjs:nodejs /app/prisma             ./prisma

# Database directory (SQLite)
RUN mkdir -p /app/db && chown nextjs:nodejs /app/db
VOLUME ["/app/db"]

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:3000/api/health-check || exit 1

CMD ["bun", "server.js"]
