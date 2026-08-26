#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════
# NetOptima Algérie — SQLite → PostgreSQL Migration Script
# ═══════════════════════════════════════════════════════════
# Usage: ./prisma/migrate-to-postgres.sh <postgres-url>
#
# Prerequisites:
#   - PostgreSQL server running
#   - bun/node installed
#   - ioredis installed (optional)
#
# Example:
#   ./prisma/migrate-to-postgres.sh postgresql://netoptima:password@localhost:5432/netoptima
# ═══════════════════════════════════════════════════════════

set -euo pipefail

PG_URL="${1:?Usage: $0 <postgresql-url>}}"

if [[ ! "$PG_URL" =~ ^postgresql:// ]]; then
  echo "ERROR: URL must start with postgresql://"
  exit 1
fi

echo "=== Step 1: Creating backup of SQLite database ==="
BACKUP_FILE="./backups/pre-pg-migration_$(date +%Y%m%d_%H%M%S).db.gz"
mkdir -p backups
sqlite3 db/custom.db ".backup '/tmp/pre-migration.db'"
gzip -c /tmp/pre-migration.db > "$BACKUP_FILE"
rm -f /tmp/pre-migration.db
echo "  Backup saved: $BACKUP_FILE"

echo "=== Step 2: Updating DATABASE_URL ==="
sed -i.bak 's|^DATABASE_URL=.*|DATABASE_URL="'"$PG_URL"'"|' .env
echo "  .env updated"

echo "=== Step 3: Switching Prisma provider to PostgreSQL ==="
sed -i 's/provider = "sqlite"/provider = "postgresql"/' prisma/schema.prisma
echo "  schema.prisma updated"

echo "=== Step 4: Generating Prisma client for PostgreSQL ==="
bunx prisma generate
echo "  Prisma client generated"

echo "=== Step 5: Creating initial migration ==="
bunx prisma migrate dev --name init-postgresql
echo "  Migration applied"

echo "=== Step 6: Seeding database ==="
bunx prisma db seed
echo "  Database seeded"

echo ""
echo "═══════════════════════════════════════════════"
echo "Migration complete! Your platform is now on PostgreSQL."
echo "SQLite backup: $BACKUP_FILE"
echo ".env backup: .env.bak"
echo "═══════════════════════════════════════════════"
