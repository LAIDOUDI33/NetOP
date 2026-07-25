/**
 * National SOC Platform - Migration Utilities
 * 
 * Helper functions for database migration operations including:
 * - Schema comparison
 * - Data transformation
 * - Backup management
 * - Migration logging
 * - Performance monitoring
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import * as crypto from 'crypto';

// ============================================================
// TYPES
// ============================================================

interface SchemaDiff {
  added: TableInfo[];
  removed: TableInfo[];
  modified: TableModification[];
}

interface TableInfo {
  name: string;
  columns: ColumnInfo[];
  indexes: IndexInfo[];
}

interface ColumnInfo {
  name: string;
  type: string;
  isNullable: boolean;
  defaultValue?: string;
}

interface IndexInfo {
  name: string;
  columns: string[];
  isUnique: boolean;
}

interface TableModification {
  tableName: string;
  changes: ColumnChange[];
}

interface ColumnChange {
  columnName: string;
  type: 'added' | 'removed' | 'modified' | 'renamed';
  oldValue?: ColumnInfo;
  newValue?: ColumnInfo;
}

interface MigrationLog {
  id: string;
  timestamp: Date;
  type: 'START' | 'COMPLETE' | 'ERROR' | 'ROLLBACK' | 'VALIDATION';
  migrationId: string;
  message: string;
  details?: Record<string, unknown>;
  durationMs?: number;
}

interface BackupMetadata {
  backupId: string;
  timestamp: Date;
  filePath: string;
  fileSize: number;
  checksum: string;
  tableCount: number;
  rowCount: number;
  schemaVersion: string;
  createdBy: string;
}

// ============================================================
// SCHEMA COMPARISON UTILITIES
// ============================================================

/**
 * Compare two Prisma schemas and return differences
 */
export function compareSchemas(oldSchemaPath: string, newSchemaPath: string): SchemaDiff {
  const oldSchema = parsePrismaSchema(fs.readFileSync(oldSchemaPath, 'utf-8'));
  const newSchema = parsePrismaSchema(fs.readFileSync(newSchemaPath, 'utf-8'));

  const oldTableNames = new Set(oldSchema.tables.map(t => t.name));
  const newTableNames = new Set(newSchema.tables.map(t => t.name));

  // Find added tables
  const added = newSchema.tables.filter(t => !oldTableNames.has(t.name));

  // Find removed tables
  const removed = oldSchema.tables.filter(t => !newTableNames.has(t.name));

  // Find modified tables
  const modified: TableModification[] = [];
  const commonTables = oldSchema.tables.filter(t => newTableNames.has(t.name));

  commonTables.forEach(oldTable => {
    const newTable = newSchema.tables.find(t => t.name === oldTable.name)!;
    const changes = compareTables(oldTable, newTable);
    
    if (changes.length > 0) {
      modified.push({
        tableName: oldTable.name,
        changes
      });
    }
  });

  return { added, removed, modified };
}

/**
 * Parse Prisma schema file into structured format
 */
function parsePrismaSchema(content: string): { tables: TableInfo[] } {
  const tables: TableInfo[] = [];
  
  // Extract model blocks using regex
  const modelRegex = /model\s+(\w+)\s*\{([^}]+)\}/g;
  let match;

  while ((match = modelRegex.exec(content)) !== null) {
    const tableName = match[1];
    const modelBody = match[2];
    
    const columns: ColumnInfo[] = [];
    const indexes: IndexInfo[] = [];

    // Parse fields
    const fieldRegex = /^\s+(\w+)\s+([\w\[\]?]+)(?:\s+@(\w+(?:\([^)]*\))?))*\s*$/gm;
    let fieldMatch;

    while ((fieldMatch = fieldRegex.exec(modelBody)) !== null) {
      if (fieldMatch[1] !== '@@') { // Skip directives
        columns.push({
          name: fieldMatch[1],
          type: fieldMatch[2],
          isNullable: !modelBody.includes(`${fieldMatch[1]} String @db`)
        });
      }
    }

    // Parse index directives
    const indexRegex = /@@index\(\[([^\]]+)\]/g;
    let indexMatch;

    while ((indexMatch = indexRegex.exec(modelBody)) !== null) {
      indexes.push({
        name: `idx_${tableName}_${Date.now()}`,
        columns: indexMatch[1].split(',').map(c => c.trim()),
        isUnique: false
      });
    }

    tables.push({ name: tableName, columns, indexes });
  }

  return { tables };
}

/**
 * Compare two table definitions
 */
function compareTables(oldTable: TableInfo, newTable: TableInfo): ColumnChange[] {
  const changes: ColumnChange[] = [];

  const oldColumns = new Map(oldTable.columns.map(c => [c.name, c]));
  const newColumns = new Map(newTable.columns.map(c => [c.name, c]));

  // Find added columns
  for (const [name, col] of newColumns) {
    if (!oldColumns.has(name)) {
      changes.push({
        columnName: name,
        type: 'added',
        newValue: col
      });
    }
  }

  // Find removed columns
  for (const [name, col] of oldColumns) {
    if (!newColumns.has(name)) {
      changes.push({
        columnName: name,
        type: 'removed',
        oldValue: col
      });
    }
  }

  // Find modified columns
  for (const [name, oldCol] of oldColumns) {
    const newCol = newColumns.get(name);
    if (newCol && (oldCol.type !== newCol.type || oldCol.isNullable !== newCol.isNullable)) {
      changes.push({
        columnName: name,
        type: 'modified',
        oldValue: oldCol,
        newValue: newCol
      });
    }
  }

  return changes;
}

// ============================================================
// BACKUP MANAGEMENT
// ============================================================

/**
 * Create a database backup with metadata
 */
export async function createBackup(backupDir: string, dbUrl: string): Promise<BackupMetadata> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupId = `backup_${timestamp}_${crypto.randomBytes(4).toString('hex')}`;
  const filePath = path.join(backupDir, `${backupId}.sql`);

  console.log(`Creating backup: ${backupId}`);

  try {
    // Create SQLite dump
    execSync(`sqlite3 "${dbUrl}" .dump > "${filePath}"`, { stdio: 'pipe' });

    // Get file stats
    const stats = fs.statSync(filePath);
    
    // Calculate checksum
    const fileContent = fs.readFileSync(filePath);
    const checksum = crypto.createHash('sha256').update(fileContent).digest('hex');

    // Count rows (approximate)
    let rowCount = 0;
    try {
      const matchResult = fileContent.toString().match(/INSERT INTO/g);
      rowCount = matchResult ? matchResult.length : 0;
    } catch {
      rowCount = -1; // Unable to count
    }

    const metadata: BackupMetadata = {
      backupId,
      timestamp: new Date(),
      filePath,
      fileSize: stats.size,
      checksum,
      tableCount: -1, // Would need DB connection to count accurately
      rowCount,
      schemaVersion: '2.0.0',
      createdBy: process.env.USER || 'system'
    };

    // Save metadata
    const metaPath = path.join(backupDir, `${backupId}.meta.json`);
    fs.writeFileSync(metaPath, JSON.stringify(metadata, null, 2));

    console.log(`Backup created successfully: ${fileSize} bytes`);
    return metadata;

  } catch (error) {
    console.error('Backup creation failed:', error);
    throw error;
  }
}

/**
 * List available backups
 */
export function listBackups(backupDir: string): BackupMetadata[] {
  if (!fs.existsSync(backupDir)) {
    return [];
  }

  const files = fs.readdirSync(backupDir)
    .filter(f => f.endsWith('.meta.json'))
    .sort()
    .reverse();

  return files.map(file => {
    const content = fs.readFileSync(path.join(backupDir, file), 'utf-8');
    return JSON.parse(content) as BackupMetadata;
  });
}

/**
 * Restore from backup
 */
export function restoreBackup(backupId: string, backupDir: string, dbUrl: string): boolean {
  const backupPath = path.join(backupDir, `${backupId}.sql`);
  
  if (!fs.existsSync(backupPath)) {
    throw new Error(`Backup not found: ${backupId}`);
  }

  console.log(`Restoring backup: ${backupId}`);

  try {
    // For SQLite, we can simply copy the database or use the dump
    execSync(`sqlite3 "${dbUrl}" < "${backupPath}"`, { stdio: 'pipe' });
    
    console.log('Backup restored successfully');
    return true;
  } catch (error) {
    console.error('Backup restoration failed:', error);
    throw error;
  }
}

/**
 * Clean up old backups (keep last N backups)
 */
export function cleanupOldBackups(backupDir: string, keepLast: number = 10): void {
  const backups = listBackups(backupDir);

  if (backups.length > keepLast) {
    const toDelete = backups.slice(keepLast);
    
    toDelete.forEach(backup => {
      const sqlFile = path.join(backupDir, `${backup.backupId}.sql`);
      const metaFile = path.join(backupDir, `${backup.backupId}.meta.json`);

      try {
        if (fs.existsSync(sqlFile)) fs.unlinkSync(sqlFile);
        if (fs.existsSync(metaFile)) fs.unlinkSync(metaFile);
        console.log(`Deleted old backup: ${backup.backupId}`);
      } catch (error) {
        console.warn(`Failed to delete backup ${backup.backupId}:`, error);
      }
    });
  }
}

// ============================================================
// MIGRATION LOGGING
// ============================================================

class MigrationLogger {
  private logDir: string;

  constructor(logDir: string) {
    this.logDir = logDir;
    this.ensureDirectory();
  }

  private ensureDirectory(): void {
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  /**
   * Log a migration event
   */
  log(event: Omit<MigrationLog, 'id' | 'timestamp'>): void {
    const entry: MigrationLog = {
      ...event,
      id: crypto.randomUUID(),
      timestamp: new Date()
    };

    const logFile = this.getLogFilePath();
    const logLine = JSON.stringify(entry) + '\n';

    fs.appendFileSync(logFile, logLine);
  }

  /**
   * Get current log file path
   */
  private getLogFilePath(): string {
    const date = new Date().toISOString().split('T')[0];
    return path.join(this.logDir, `migration-${date}.log`);
  }

  /**
   * Get recent migration history
   */
  getHistory(limit: number = 50): MigrationLog[] {
    const logs: MigrationLog[] = [];
    const logFiles = this.getLogFiles().slice(-7); // Last 7 days

    logFiles.forEach(file => {
      const content = fs.readFileSync(file, 'utf-8');
      content.split('\n')
        .filter(line => line.trim())
        .forEach(line => {
          try {
            logs.push(JSON.parse(line));
          } catch {
            // Skip malformed lines
          }
        });
    });

    return logs
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  /**
   * Get log files sorted by date
   */
  private getLogFiles(): string[] {
    if (!fs.existsSync(this.logDir)) return [];

    return fs.readdirSync(this.logDir)
      .filter(f => f.startsWith('migration-') && f.endsWith('.log'))
      .sort();
  }

  /**
   * Generate summary report
   */
  generateSummary(startDate: Date, endDate: Date): {
    totalMigrations: number;
    successfulMigrations: number;
    failedMigrations: number;
    rollbacks: number;
    averageDuration: number;
    errors: Array<{ message: string; count: number }>;
  } {
    const history = this.getHistory(1000); // Get all recent logs
    
    const filtered = history.filter(
      log => log.timestamp >= startDate && log.timestamp <= endDate
    );

    const completed = filtered.filter(l => l.type === 'COMPLETE');
    const failed = filtered.filter(l => l.type === 'ERROR');
    const rollbacks = filtered.filter(l => l.type === 'ROLLBACK');

    const avgDuration = completed.length > 0
      ? completed.reduce((sum, l) => sum + (l.durationMs || 0), 0) / completed.length
      : 0;

    // Group errors
    const errorMap = new Map<string, number>();
    failed.forEach(l => {
      const key = l.message.substring(0, 100);
      errorMap.set(key, (errorMap.get(key) || 0) + 1);
    });

    return {
      totalMigrations: filtered.filter(l => l.type === 'START').length,
      successfulMigrations: completed.length,
      failedMigrations: failed.length,
      rollbacks: rollbacks.length,
      averageDuration: Math.round(avgDuration),
      errors: Array.from(errorMap.entries()).map(([message, count]) => ({ message, count }))
    };
  }
}

// ============================================================
// PERFORMANCE MONITORING
// ============================================================

/**
 * Measure execution time of an operation
 */
export async function measurePerformance<T>(
  operation: () => Promise<T>,
  label: string
): Promise<{ result: T; durationMs: number }> {
  const startTime = performance.now();
  
  try {
    const result = await operation();
    const durationMs = Math.round(performance.now() - startTime);
    
    console.log(`⏱️  ${label}: ${durationMs}ms`);
    
    return { result, durationMs };
  } catch (error) {
    const durationMs = Math.round(performance.now() - startTime);
    console.error(`❌ ${label} failed after ${durationMs}ms:`, error);
    throw error;
  }
}

/**
 * Monitor memory usage during migration
 */
export function getMemoryUsage(): {
  rss: number;
  heapUsed: number;
  heapTotal: number;
  external: number;
  formatted: string;
} {
  const usage = process.memoryUsage();
  
  return {
    ...usage,
    formatted: `RSS: ${(usage.rss / 1024 / 1024).toFixed(1)}MB, Heap: ${(usage.heapUsed / 1024 / 1024).toFixed(1)}MB`
  };
}

// ============================================================
// DATA TRANSFORMATION HELPERS
// ============================================================

/**
 * Transform data between schema versions
 */
export class DataTransformer {
  private transformations: Map<string, (data: any) => any> = new Map();

  /**
   * Register a transformation function for a table
   */
  registerTransformation(tableName: string, transformFn: (data: any) => any): void {
    this.transformations.set(tableName, transformFn);
  }

  /**
   * Apply transformations to data
   */
  transform(tableName: string, data: any[]): any[] {
    const transformFn = this.transformations.get(tableName);
    
    if (!transformFn) {
      return data;
    }

    return data.map(row => transformFn(row));
  }

  /**
   * Batch transform with progress tracking
   */
  async batchTransform(
    tableName: string,
    data: any[],
    batchSize: number = 1000,
    onProgress?: (completed: number, total: number) => void
  ): Promise<any[]> {
    const results: any[] = [];
    const totalBatches = Math.ceil(data.length / batchSize);

    for (let i = 0; i < data.length; i += batchSize) {
      const batch = data.slice(i, i + batchSize);
      const transformed = this.transform(tableName, batch);
      results.push(...transformed);

      if (onProgress) {
        onProgress(Math.min(i + batchSize, data.length), data.length);
      }

      // Yield to event loop for large datasets
      if (i % (batchSize * 10) === 0) {
        await new Promise(resolve => setTimeout(resolve, 0));
      }
    }

    return results;
  }
}

// ============================================================
// EXPORTS
// ============================================================

export { MigrationLogger };
export { DataTransformer };

// Default export with utility functions
export default {
  compareSchemas,
  createBackup,
  listBackups,
  restoreBackup,
  cleanupOldBackups,
  measurePerformance,
  getMemoryUsage,
  MigrationLogger,
  DataTransformer
};
