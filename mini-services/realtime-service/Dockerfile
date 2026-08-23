# NetOP Realtime Service — WebSocket
FROM oven/bun:1-alpine
WORKDIR /app
COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile --production
COPY . .
RUN addgroup --system --gid 1001 netop && \
    adduser --system --uid 1001 --ingroup netop netop
USER netop
EXPOSE 3003
CMD ["bun", "index.ts"]
