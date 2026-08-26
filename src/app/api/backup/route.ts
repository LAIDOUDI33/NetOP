import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/with-auth';
import { AuthenticatedRequest } from '@/lib/with-auth';
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit';

import { existsSync, readdirSync, statSync, unlinkSync } from 'fs';
import { join } from 'path';

const BACKUP_DIR = process.env.BACKUP_DIR || './backups';
const MAX_BACKUPS = parseInt(process.env.MAX_BACKUPS || '10', 10);

export const GET = withAuth(async (request: AuthenticatedRequest) => {
  const { limited, resetMs } = rateLimit(request, { windowMs: 60_000, max: 30 });
  if (limited) return rateLimitResponse(resetMs);

  try {
    if (!existsSync(BACKUP_DIR)) {
      return NextResponse.json({ backups: [], totalSize: 0 });
    }

    const files = readdirSync(BACKUP_DIR)
      .filter(f => f.startsWith('netoptima_') && f.endsWith('.db.gz'))
      .map(f => {
        const stat = statSync(join(BACKUP_DIR, f));
        return {
          filename: f,
          size: stat.size,
          created: stat.mtime.toISOString(),
          sizeFormatted: `${(stat.size / 1024).toFixed(1)} KB`,
        };
      })
      .sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime());

    const totalSize = files.reduce((sum, f) => sum + f.size, 0);

    return NextResponse.json({
      backups: files,
      total: files.length,
      totalSize,
      maxBackups: MAX_BACKUPS,
    });
  } catch (error: unknown) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
});

export const POST = withAuth(async (request: AuthenticatedRequest) => {
  const { limited, resetMs } = rateLimit(request, { windowMs: 60_000, max: 5 });
  if (limited) return rateLimitResponse(resetMs);

  try {
    const { execSync: exec } = await import('child_process');
    const { mkdirSync } = await import('fs');

    mkdirSync(BACKUP_DIR, { recursive: true });

    // Extract db path from DATABASE_URL
    const dbUrl = process.env.DATABASE_URL || 'file:./db/custom.db';
    const dbFile = dbUrl.replace('file:', '');

    if (!existsSync(dbFile)) {
      return NextResponse.json({ error: 'Database file not found' }, { status: 404 });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const backupFile = `${BACKUP_DIR}/netoptima_${timestamp}.db.gz`;

    // Use SQLite .backup command for safe backup, then gzip
    const tempBackup = `/tmp/netoptima_backup_${Date.now()}.db`;
    exec(`sqlite3 "${dbFile}" ".backup '${tempBackup}'"`);
    exec(`gzip -c "${tempBackup}" > "${backupFile}"`);
    exec(`rm -f "${tempBackup}"`);

    // Prune old backups beyond MAX_BACKUPS
    if (existsSync(BACKUP_DIR)) {
      const existing = readdirSync(BACKUP_DIR)
        .filter(f => f.startsWith('netoptima_') && f.endsWith('.db.gz'))
        .sort()
        .reverse();

      for (let i = MAX_BACKUPS; i < existing.length; i++) {
        try { unlinkSync(join(BACKUP_DIR, existing[i])); } catch {}
      }
    }

    const stat = statSync(backupFile);
    return NextResponse.json({
      success: true,
      message: 'Backup created successfully',
      filename: backupFile,
      size: stat.size,
      sizeFormatted: `${(stat.size / 1024).toFixed(1)} KB`,
    });
  } catch (error: unknown) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
});

export const DELETE = withAuth(async (request: AuthenticatedRequest) => {
  const { limited, resetMs } = rateLimit(request, { windowMs: 60_000, max: 10 });
  if (limited) return rateLimitResponse(resetMs);

  try {
    const { searchParams } = new URL(request.url);
    const filename = searchParams.get('filename');

    if (!filename) {
      return NextResponse.json({ error: 'filename query parameter required' }, { status: 400 });
    }

    // Prevent path traversal
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return NextResponse.json({ error: 'Invalid filename' }, { status: 400 });
    }

    const filePath = join(BACKUP_DIR, filename);
    if (!existsSync(filePath)) {
      return NextResponse.json({ error: 'Backup not found' }, { status: 404 });
    }

    unlinkSync(filePath);
    return NextResponse.json({ success: true, message: `Backup ${filename} deleted` });
  } catch (error: unknown) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
});
