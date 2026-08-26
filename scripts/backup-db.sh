#!/usr/bin/env bash
# ═══════════════════════════════════════════
# NetOptima Algérie — SQLite Backup Script
# ═══════════════════════════════════════════
# Usage: ./scripts/backup-db.sh [backup_dir]
# Default backup directory: ./backups

set -euo pipefail

BACKUP_DIR="${1:-./backups}"
DB_PATH="${DATABASE_URL:-file:./db/custom.db}"

# Extract path from DATABASE_URL (format: file:./db/custom.db)
DB_FILE=$(echo "$DB_PATH" | sed 's|^file:||')

if [ ! -f "$DB_FILE" ]; then
  echo "ERROR: Database file not found: $DB_FILE"
  echo "Set DATABASE_URL or ensure the file exists."
  exit 1
fi

mkdir -p "$BACKUP_DIR"

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/netoptima_${TIMESTAMP}.db.gz"

# Create backup using SQLite .backup command (safe even during writes)
TEMP_BACKUP=$(mktemp)
sqlite3 "$DB_FILE" ".backup '$TEMP_BACKUP'"
gzip -c "$TEMP_BACKUP" > "$BACKUP_FILE"
rm -f "$TEMP_BACKUP"

FILE_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
echo "✅ Backup created: $BACKUP_FILE ($FILE_SIZE)"

# Keep only last 30 backups
ls -t "${BACKUP_DIR}"/netoptima_*.db.gz 2>/dev/null | tail -n +31 | xargs -r rm --
echo "🔄 Old backups pruned (keeping last 30)"
