FROM oven/bun:1
WORKDIR /app
COPY package.json ./
RUN bun install --frozen-lockfile || bun install
COPY . .
EXPOSE 3010
CMD ["bun", "index.ts"]
