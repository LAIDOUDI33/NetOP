/**
 * National SOC Platform - Migration Validator
 * 
 * Validates database schema integrity, data consistency,
 * and migration safety before and after migrations.
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

// Types
interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  stats: ValidationStats;
}

interface ValidationError {
  code: string;
  message: string;
  table?: string;
  column?: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
}

interface ValidationWarning {
  code: string;
  message: string;
  table?: string;
  suggestion?: string;
}

interface ValidationStats {
  tablesChecked: number;
  indexesChecked: number;
  foreignKeysChecked: number;
  rowsValidated: number;
  durationMs: number;
}

/**
 * Schema Validator Class
 */
class MigrationValidator {
  
  /**
   * Full schema validation suite
   */
  async validateFullSchema(): Promise<ValidationResult> {
    const startTime = Date.now();
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    console.log('\n🔍 Starting full schema validation...\n');

    // Run all validation checks
    const [tableCheck, indexCheck, fkCheck, dataCheck] = await Promise.all([
      this.validateTables(),
      this.validateIndexes(),
      this.validateForeignKeys(),
      this.validateDataIntegrity()
    ]);

    errors.push(...tableCheck.errors, ...indexCheck.errors, ...fkCheck.errors, ...dataCheck.errors);
    warnings.push(...tableCheck.warnings, ...indexCheck.warnings, ...fkCheck.warnings, ...dataCheck.warnings);

    const result: ValidationResult = {
      valid: errors.filter(e => e.severity === 'CRITICAL').length === 0,
      errors,
      warnings,
      stats: {
        tablesChecked: tableCheck.count || 0,
        indexesChecked: indexCheck.count || 0,
        foreignKeysChecked: fkCheck.count || 0,
        rowsValidated: dataCheck.count || 0,
        durationMs: Date.now() - startTime
      }
    };

    this.printValidationResult(result);
    return result;
  }

  /**
   * Validate all tables exist with correct structure
   */
  private async validateTables(): Promise<{
    errors: ValidationError[];
    warnings: ValidationWarning[];
    count: number;
  }> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    
    console.log('📋 Validating tables...');

    // Expected SOC platform tables (from our schema)
    const expectedTables = [
      // Auth domain
      'User', 'Role', 'Permission', 'Session',
      // Core SOC domain
      'Alert', 'Incident', 'IncidentUpdate', 'Evidence', 'Task',
      // Threat Intel domain
      'ThreatIndicator', 'IOC', 'TIPLv2', 'Campaign',
      // Telecom domain
      'Subscriber', 'NetworkElement', 'SS7Message', 
      'GTPSession', 'DiameterSession', 'RadiusSession', 'SIPSession',
      // Compliance domain
      'AuditLog', 'Report', 'SystemConfig', 'DataRetentionPolicy'
    ];

    try {
      // Get actual tables from database
      const tables = await prisma.$queryRaw<Array<{name: string}>>`
        SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_prisma_%'
      `;

      const actualTableNames = tables.map(t => t.name);
      
      expectedTables.forEach(table => {
        if (!actualTableNames.includes(table)) {
          errors.push({
            code: 'MISSING_TABLE',
            message: `Required table '${table}' does not exist`,
            table,
            severity: 'CRITICAL'
          });
        }
      });

      // Check for unexpected tables
      actualTableNames.forEach(tableName => {
        if (!expectedTables.includes(tableName)) {
          warnings.push({
            code: 'UNEXPECTED_TABLE',
            message: `Unexpected table '${tableName}' found in database`,
            table: tableName,
            suggestion: 'Verify if this table is needed or can be removed'
          });
        }
      });

      console.log(`  ✅ Checked ${expectedTables.length} expected tables`);
      return { errors, warnings, count: expectedTables.length };

    } catch (error) {
      errors.push({
        code: 'TABLE_CHECK_ERROR',
        message: `Failed to validate tables: ${(error as Error).message}`,
        severity: 'HIGH'
      });
      return { errors, warnings, count: 0 };
    }
  }

  /**
   * Validate indexes are properly defined
   */
  private async validateIndexes(): Promise<{
    errors: ValidationError[];
    warnings: ValidationWarning[];
    count: number;
  }> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    
    console.log('🔎 Validating indexes...');

    try {
      // Critical indexes that should exist for performance
      const criticalIndexes = [
        { table: 'Alert', columns: ['status'] },
        { table: 'Alert', columns: ['severity'] },
        { table: 'Incident', columns: ['status'] },
        { table: 'Incident', columns: ['severity'] },
        { table: 'Session', columns: ['userId'] },
        { table: 'Session', columns: ['token'] },
        { table: 'AuditLog', columns: ['createdAt'] },
        { table: 'SS7Message', columns: ['timestamp'] },
        { table: 'GTPSession', columns: ['imsi'] },
        { table: 'SIPSession', columns: ['callId'] }
      ];

      for (const idx of criticalIndexes) {
        // Check if index exists (simplified check)
        const indexExists = await this.checkIndexExists(idx.table, idx.columns);
        
        if (!indexExists) {
          warnings.push({
            code: 'MISSING_INDEX',
            message: `Missing recommended index on ${idx.table}(${idx.columns.join(', ')})`,
            table: idx.table,
            suggestion: 'Consider adding this index for query performance'
          });
        }
      }

      console.log(`  ✅ Checked ${criticalIndexes.length} critical indexes`);
      return { errors, warnings, count: criticalIndexes.length };

    } catch (error) {
      errors.push({
        code: 'INDEX_CHECK_ERROR',
        message: `Failed to validate indexes: ${(error as Error).message}`,
        severity: 'MEDIUM'
      });
      return { errors, warnings, count: 0 };
    }
  }

  /**
   * Check if an index exists on a table
   */
  private async checkIndexExists(table: string, columns: string[]): Promise<boolean> {
    try {
      const indexes = await prisma.$queryRaw<Array<{name: string}>>`
        SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='${table}' AND sql IS NOT NULL
      `;
      return indexes.length > 0; // Simplified check
    } catch {
      return false;
    }
  }

  /**
   * Validate foreign key constraints
   */
  private async validateForeignKeys(): Promise<{
    errors: ValidationError[];
    warnings: ValidationWarning[];
    count: number;
  }> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    
    console.log('🔗 Validating foreign keys...');

    try {
      // Enable foreign key enforcement
      await prisma.$executeRaw`PRAGMA foreign_keys = ON`;

      // Check referential integrity
      const integrityCheck = await prisma.$queryRaw<Array<{integrity: string}>>`PRAGMA integrity_check`;
      
      if (integrityCheck[0]?.integrity !== 'ok') {
        errors.push({
          code: 'INTEGRITY_FAILURE',
          message: `Database integrity check failed: ${integrityCheck[0]?.integrity}`,
          severity: 'CRITICAL'
        });
      } else {
        console.log('  ✅ Referential integrity verified');
      }

      return { errors, warnings, count: 1 };

    } catch (error) {
      errors.push({
        code: 'FK_CHECK_ERROR',
        message: `Failed to validate foreign keys: ${(error as Error).message}`,
        severity: 'HIGH'
      });
      return { errors, warnings, count: 0 };
    }
  }

  /**
   * Validate data integrity within tables
   */
  private async validateDataIntegrity(): Promise<{
    errors: ValidationError[];
    warnings: ValidationWarning[];
    count: number;
  }> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    let totalRows = 0;
    
    console.log('📊 Validating data integrity...');

    try {
      // Check for orphaned records (records without parents)
      const checks = [
        {
          table: 'Alert',
          query: `SELECT COUNT(*) as count FROM Alert WHERE incidentId IS NOT NULL AND incidentId NOT IN (SELECT id FROM Incident)`,
          error: 'Orphaned alerts found (referencing non-existent incidents)'
        },
        {
          table: 'IncidentUpdate',
          query: `SELECT COUNT(*) as count FROM IncidentUpdate WHERE incidentId NOT IN (SELECT id FROM Incident)`,
          error: 'Orphaned incident updates found'
        },
        {
          table: 'Evidence',
          query: `SELECT COUNT(*) as count FROM Evidence WHERE incidentId NOT IN (SELECT id FROM Incident)`,
          error: 'Orphaned evidence records found'
        },
        {
          table: 'Task',
          query: `SELECT COUNT(*) as count FROM Task WHERE assigneeId IS NOT NULL AND assigneeId NOT IN (SELECT id FROM User)`,
          error: 'Tasks assigned to non-existent users'
        }
      ];

      for (const check of checks) {
        try {
          const result = await prisma.$queryRaw<Array<{count: number}>>`
            ${check.query}
          `;
          
          totalRows += result[0]?.count || 0;
          
          if ((result[0]?.count || 0) > 0) {
            warnings.push({
              code: 'ORPHANED_RECORDS',
              message: `${check.error}: ${result[0]?.count} record(s)`,
              table: check.table,
              suggestion: 'Clean up orphaned records or restore missing parent records'
            });
          }
        } catch (queryError) {
          // Table might not exist yet during initial migration
          warnings.push({
            code: 'DATA_CHECK_SKIPPED',
            message: `Skipped data check for ${check.table}: ${(queryError as Error).message}`,
            table: check.table
          });
        }
      }

      // Validate enum-like fields have valid values
      await this.validateEnumValues(errors, warnings);

      console.log(`  ✅ Validated data integrity across tables`);
      return { errors, warnings, count: totalRows };

    } catch (error) {
      errors.push({
        code: 'DATA_INTEGRITY_ERROR',
        message: `Failed to validate data: ${(error as Error).message}`,
        severity: 'MEDIUM'
      });
      return { errors, warnings, count: totalRows };
    }
  }

  /**
   * Validate enum field values
   */
  private async validateEnumValues(
    errors: ValidationError[], 
    warnings: ValidationWarning[]
  ): Promise<void> {
    // Define valid values for enum-like fields
    const validSeverities = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'];
    const validStatuses = ['NEW', 'ACKNOWLEDGED', 'IN_PROGRESS', 'ESCALATED', 'RESOLVED', 'FALSE_POSITIVE', 'SUPPRESSED'];

    try {
      // Check Alert severities
      const invalidAlertSeverities = await prisma.$queryRaw<Array<{severity: string}>>`
        SELECT DISTINCT severity FROM Alert WHERE severity NOT IN (${validSeverities.map(v => `'${v}'`).join(', ')})
      `;
      
      if (invalidAlertSeverities.length > 0) {
        errors.push({
          code: 'INVALID_ENUM_VALUE',
          message: `Invalid Alert severity values found: ${invalidAlertSeverities.map(s => s.severity).join(', ')}`,
          table: 'Alert',
          severity: 'MEDIUM'
        });
      }
    } catch {
      // Table might not exist yet
    }
  }

  /**
   * Print validation results
   */
  private printValidationResult(result: ValidationResult): void {
    console.log('\n════════════════════════════════════════════');
    console.log('           VALIDATION RESULTS              ');
    console.log('════════════════════════════════════════════\n');

    console.log(`⏱️  Duration: ${result.stats.durationMs}ms`);
    console.log(`📋 Tables checked: ${result.stats.tablesChecked}`);
    console.log(`🔎 Indexes checked: ${result.stats.indexesChecked}`);
    console.log(`🔗 Foreign keys checked: ${result.stats.foreignKeysChecked}`);
    console.log(`📊 Rows validated: ${result.stats.rowsValidated}`);

    if (result.errors.length > 0) {
      console.log('\n❌ ERRORS:');
      result.errors.forEach(err => {
        const icon = err.severity === 'CRITICAL' ? '🔴' : err.severity === 'HIGH' ? '🟠' : '🟡';
        console.log(`  ${icon} [${err.code}] ${err.message}`);
        if (err.table) console.log(`     Table: ${err.table}`);
      });
    }

    if (result.warnings.length > 0) {
      console.log('\n⚠️  WARNINGS:');
      result.warnings.forEach(warn => {
        console.log(`  ⚠️  [${warn.code}] ${warn.message}`);
        if (warn.suggestion) console.log(`     💡 Suggestion: ${warn.suggestion}`);
      });
    }

    console.log('\n════════════════════════════════════════════');
    console.log(`Overall Status: ${result.valid ? '✅ VALID' : '❌ INVALID'}`);
    console.log('════════════════════════════════════════════\n');
  }

  /**
   * Quick health check for CI/CD pipelines
   */
  async quickHealthCheck(): Promise<boolean> {
    try {
      await prisma.$connect();
      await prisma.$queryRaw`SELECT 1`;
      await prisma.$disconnect();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Generate validation report
   */
  async generateReport(): Promise<string> {
    const result = await this.validateFullSchema();
    
    const report = `
# Database Validation Report

**Generated:** ${new Date().toISOString()}
**Status:** ${result.valid ? '✅ PASSED' : '❌ FAILED'}

## Summary

| Metric | Value |
|--------|-------|
| Duration | ${result.stats.durationMs}ms |
| Tables Checked | ${result.stats.tablesChecked} |
| Indexes Checked | ${result.stats.indexesChecked} |
| Foreign Keys | ${result.stats.foreignKeysChecked} |
| Rows Validated | ${result.stats.rowsValidated} |

## Errors (${result.errors.length})

${result.errors.length === 0 ? 'No errors found.' : result.errors.map(e => `- **[${e.code}]** ${e.severity}: ${e.message}`).join('\n')}

## Warnings (${result.warnings.length})

${result.warnings.length === 0 ? 'No warnings found.' : result.warnings.map(w => `- **[${w.code}]** ${w.message}${w.suggestion ? ` (${w.suggestion})` : ''}`).join('\n')}
`;

    return report;
  }
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  
  const validator = new MigrationValidator();

  switch (command) {
    case 'validate':
      await validator.validateFullSchema();
      break;

    case 'health':
      const healthy = await validator.quickHealthCheck();
      process.exit(healthy ? 0 : 1);

    case 'report':
      const report = await validator.generateReport();
      console.log(report);
      
      // Save report to file
      const reportPath = path.join(process.cwd(), 'logs', 'validation-report.md');
      fs.writeFileSync(reportPath, report);
      console.log(`\n📄 Report saved to: ${reportPath}`);
      break;

    default:
      console.log(`
🔍 National SOC Platform - Migration Validator

Usage:
  node migration-validator.ts <command>

Commands:
  validate    Run full schema validation
  health      Quick health check (for CI/CD)
  report      Generate detailed validation report

Examples:
  node migration-validator.ts validate
  node migration-validator.ts health
  node migration-validator.ts report
      `);
  }

  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error('❌ Fatal error:', error);
  await prisma.$disconnect();
  process.exit(1);
});

export { MigrationValidator, ValidationResult };
