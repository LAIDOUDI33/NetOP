#!/usr/bin/env bash
# ═══════════════════════════════════════════
# NetOptima Algérie — SQLite Restore Script
# ═══════════════════════════════════════════
# Usage: ./scripts/restore-db.sh <backup_file.gz>

set -euo pipefail

if [ $# -lt 1 ]; then
  echo "Usage: $0 <backup_file.gz>"
  echo "Available backups:"
  ls -lh ./backups/netoptima_*.db.gz 2>/dev/null || echo "  (none found)"
  exit 1
fi

BACKUP_FILE="$1"
DB_PATH="${DATABASE_URL:-file:./db/custom.db}"
DB_FILE=$(echo "$DB_PATH" | sed 's|^file:||')

if [ ! -f "$BACKUP_FILE" ]; then
  echo "ERROR: Backup file not found: $BACKUP_FILE"
  exit 1
fi

# Create timestamped backup of current DB before restoring
if [ -f "$DB_FILE" ]; then
  PRE_RESTORE="${DB_FILE}.pre-restore.$(date +%Y%m%d_%H%M%S)"
  cp "$DB_FILE" "$PRE_RESTORE"
  echo "📦 Current database backed up to: $PRE_RESTORE"
fi

# Restore
TEMP_RESTORE=$(mktemp)
gunzip -c "$BACKUP_FILE" > "$TEMP_RESTORE"
cp "$TEMP_RESTORE" "$DB_FILE"
rm -f "$TEMP_RESTORE"

echo "✅ Database restored from: $BACKUP_FILE"
echo "⚠️  Run 'bunx prisma db push' if schema has changed since backup."
