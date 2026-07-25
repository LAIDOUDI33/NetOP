#!/bin/bash
# ============================================================
# National SOC Platform - Database Migration Script
# Migrates from SQLite to PostgreSQL for Djezzy Production
# ============================================================

set -e  # Exit on error

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration (override via environment or arguments)
POSTGRES_HOST="${POSTGRES_HOST:-localhost}"
POSTGRES_PORT="${POSTGRES_PORT:-5432}"
POSTGRES_USER="${POSTGRES_USER:-soc_admin}"
POSTGRES_DB="${POSTGRES_DB:-soc_platform}"
SQLITE_DB_PATH="${SQLITE_DB_PATH:-./db/custom.db}"
BACKUP_DIR="${BACKUP_DIR:-./backups}"

print_header() {
    echo -e "\n${BLUE}============================================================${NC}"
    echo -e "${BLUE} $1${NC}"
    echo -e "${BLUE}============================================================${NC}\n"
}

print_success() { echo -e "${GREEN}✓ $1${NC}"; }
print_error() { echo -e "${RED}✗ $1${NC}"; }
print_warning() { echo -e "${YELLOW}⚠ $1${NC}"; }

# ============================================================
# Step 1: Check Prerequisites
# ============================================================
check_prerequisites() {
    print_header "Checking Prerequisites"
    
    # Check SQLite database exists
    if [ ! -f "$SQLITE_DB_PATH" ]; then
        print_error "SQLite database not found at: $SQLITE_DB_PATH"
        exit 1
    fi
    print_success "SQLite database found: $SQLITE_DB_PATH"
    
    # Check pg_dump/pg_restore available
    if command -v psql &> /dev/null; then
        print_success "psql available: $(psql --version)"
    else
        print_error "psql not installed. Install PostgreSQL client tools."
        exit 1
    fi
    
    # Test PostgreSQL connection
    if PGPASSWORD="$POSTGRES_PASSWORD" psql -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "SELECT 1;" &>/dev/null; then
        print_success "PostgreSQL connection successful"
    else
        print_error "Cannot connect to PostgreSQL at $POSTGRES_HOST:$POSTGRES_PORT"
        exit 1
    fi
    
    # Create backup directory
    mkdir -p "$BACKUP_DIR"
    print_success "Backup directory: $BACKUP_DIR"
}

# ============================================================
# Step 2: Backup Existing Data
# ============================================================
backup_sqlite() {
    print_header "Backing Up SQLite Database"
    
    BACKUP_FILE="$BACKUP_DIR/sqlite-backup-$(date +%Y%m%d-%H%M%S).db"
    
    cp "$SQLITE_DB_PATH" "$BACKUP_FILE"
    
    print_success "SQLite backup created: $BACKUP_FILE"
    echo "Backup size: $(du -h "$BACKUP_FILE" | cut -f1)"
}

backup_postgresql() {
    print_header "Backing Up PostgreSQL Database (if exists)"
    
    BACKUP_FILE="$BACKUP_DIR/postgres-backup-before-migration-$(date +%Y%m%d-%H%M%S).sql"
    
    PGPASSWORD="$POSTGRES_PASSWORD" pg_dump \
        -h "$POSTGRES_HOST" \
        -p "$POSTGRES_PORT" \
        -U "$POSTGRES_USER" \
        -d "$POSTGRES_DB" \
        --no-owner \
        --no-acl \
        --format=custom \
        -f "$BACKUP_FILE" 2>/dev/null || print_warning "No existing data to backup or backup failed"
    
    if [ -f "$BACKUP_FILE" ]; then
        print_success "PostgreSQL backup created: $BACKUP_FILE"
    fi
}

# ============================================================
# Step 3: Export Data from SQLite
# ============================================================
export_from_sqlite() {
    print_header "Exporting Data from SQLite"
    
    EXPORT_DIR="$BACKUP_DIR/export-$(date +%Y%m%d-%H%M%S)"
    mkdir -p "$EXPORT_DIR"
    
    # Get list of tables
    TABLES=$(sqlite3 "$SQLITE_DB_PATH" ".tables")
    
    print_success "Found tables: $TABLES"
    
    # Export each table to CSV
    for TABLE in $TABLES; do
        CSV_FILE="$EXPORT_DIR/${TABLE}.csv"
        
        # Export with headers
        sqlite3 -header -csv "$SQLITE_DB_PATH" "SELECT * FROM $TABLE;" > "$CSV_FILE" 2>/dev/null
        
        ROW_COUNT=$(wc -l < "$CSV_FILE")
        print_success "Exported $TABLE: $ROW_COUNT rows"
    done
    
    echo "$EXPORT_DIR"
}

# ============================================================
# Step 4: Prepare PostgreSQL Schema
# ============================================================
prepare_postgresql_schema() {
    print_header "Preparing PostgreSQL Schema"
    
    # Run Prisma migrations
    print_success "Running Prisma migrate deploy..."
    
    npx prisma migrate deploy \
        --url "postgresql://$POSTGRES_USER:$POSTGRES_PASSWORD@$POSTGRES_HOST:$POSTGRES_PORT/$POSTGRES_DB" || {
        print_error "Prisma migration failed!"
        return 1
    }
    
    print_success "PostgreSQL schema created successfully"
}

# ============================================================
# Step 5: Import Data to PostgreSQL
# ============================================================
import_to_postgresql() {
    print_header "Importing Data to PostgreSQL"
    
    EXPORT_DIR="$1"
    
    # Get list of tables in correct order (respect foreign keys)
    TABLES_ORDER=(
        "Role"
        "User"
        "Session"
        "NetworkElement"
        "Subscriber"
        "Campaign"
        "ThreatIndicator"
        "IOC"
        "Alert"
        "Incident"
        "Task"
        "IncidentUpdate"
        "SS7Message"
        "GTPSession"
        "SIPSession"
        "DiameterSession"
        "AuditLog"
    )
    
    for TABLE in "${TABLES_ORDER[@]}"; do
        CSV_FILE="$EXPORT_DIR/${TABLE}.csv"
        
        if [ ! -f "$CSV_FILE" ]; then
            print_warning "Skipping $TABLE (no export file)"
            continue
        fi
        
        # Skip header row, get row count
        ROW_COUNT=$(( $(wc -l < "$CSV_FILE") - 1 ))
        
        if [ "$ROW_COUNT" -le 0 ]; then
            print_warning "Skipping $TABLE (empty file)"
            continue
        fi
        
        # Import using COPY command (fast)
        print_success "Importing $TABLE ($ROW_COUNT rows)..."
        
        PGPASSWORD="$POSTGRES_PASSWORD" psql \
            -h "$POSTGRES_HOST" \
            -p "$POSTGRES_PORT" \
            -U "$POSTGRES_USER" \
            -d "$POSTGRES_DB" \
            -c "\copy \"$TABLE\" FROM '$CSV_FILE' WITH CSV HEADER NULL ''" 2>&1 | grep -v "^COPY" || {
            print_warning "Some issues importing $TABLE (may need manual review)"
        }
    done
    
    print_success "Data import completed"
}

# ============================================================
# Step 6: Verify Migration
# ============================================================
verify_migration() {
    print_header "Verifying Migration"
    
    # Compare record counts
    echo -e "\n${YELLOW}Record Count Comparison:${NC}\n"
    printf "%-25s %15s %15s\n" "Table" "SQLite" "PostgreSQL"
    printf "%-25s %15s %15s\n" "-----" "------" "-----------"
    
    TABLES=$(sqlite3 "$SQLITE_DB_PATH" ".tables")
    
    for TABLE in $TABLES; do
        SQLITE_COUNT=$(sqlite3 "$SQLITE_DB_PATH" "SELECT COUNT(*) FROM $TABLE;" 2>/dev/null || echo "N/A")
        PG_COUNT=$(PGPASSWORD="$POSTGRES_PASSWORD" psql \
            -h "$POSTGRES_HOST" \
            -p "$POSTGRES_PORT" \
            -U "$POSTGRES_USER" \
            -d "$POSTGRES_DB" \
            -t -c "SELECT COUNT(*) FROM \"$TABLE\";" 2>/dev/null | tr -d ' ' || echo "N/A")
        
        if [ "$SQLITE_COUNT" = "$PG_COUNT" ]; then
            STATUS="${GREEN}✓${NC}"
        else
            STATUS="${RED}✗${NC}"
        fi
        
        printf "%-25s %15s %15s %s\n" "$TABLE" "$SQLITE_COUNT" "$PG_COUNT" "$STATUS"
    done
    
    echo ""
    print_success "Migration verification complete"
}

# ============================================================
# Step 7: Update Configuration
# ============================================================
update_configuration() {
    print_header "Updating Application Configuration"
    
    NEW_DATABASE_URL="postgresql://$POSTGRES_USER:$POSTGRES_PASSWORD@$POSTGRES_HOST:$POSTGRES_PORT/$POSTGRES_DB"
    
    print_success "New DATABASE_URL:"
    echo "  $NEW_DATABASE_URL"
    
    # Update .env.production if it exists
    if [ -f .env.production ]; then
        sed -i.bak "s|^DATABASE_URL=.*|DATABASE_URL=$NEW_DATABASE_URL|" .env.production
        print_success "Updated .env.production"
    fi
    
    # Show next steps
    echo -e "\n${YELLOW}Next Steps:${NC}"
    echo "1. Update your Kubernetes secrets with new DATABASE_URL"
    echo "2. Restart application pods"
    echo "3. Run health checks"
    echo "4. Monitor logs for any issues"
}

# ============================================================
# Main Execution
# ============================================================
main() {
    print_header "National SOC Platform - Database Migration"
    echo "Migrating from SQLite to PostgreSQL"
    echo "Source: $SQLITE_DB_PATH"
    echo "Target: postgresql://$POSTGRES_USER@$POSTGRES_HOST:$POSTGRES_PORT/$POSTGRES_DB"
    echo ""
    
    # Confirm migration
    read -p "Proceed with migration? (yes/no) " confirm
    if [ "$confirm" != "yes" ]; then
        print_warning "Migration cancelled"
        exit 0
    fi
    
    # Execute migration steps
    check_prerequisites
    backup_sqlite
    backup_postgresql
    
    EXPORT_DIR=$(export_from_sqlite)
    prepare_postgresql_schema
    import_to_postgresql "$EXPORT_DIR"
    verify_migration
    update_configuration
    
    print_header "Migration Complete! 🎉"
    
    echo -e "\n${GREEN}Your database has been successfully migrated to PostgreSQL.${NC}"
    echo -e "\n${YELLOW}Important Notes:${NC}"
    echo "- Keep the SQLite backup for at least 30 days"
    echo "- Test all application features thoroughly"
    echo "- Monitor query performance"
    echo "- Set up automated backups for PostgreSQL"
}

# Run main function
main "$@"
