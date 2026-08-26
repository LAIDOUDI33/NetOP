import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/with-auth';
import { AuthenticatedRequest } from '@/lib/with-auth';
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit';
import { existsSync, createReadStream, createWriteStream } from 'fs';
import { join } from 'path';
import { pipeline } from 'stream/promises';
import { createGunzip } from 'zlib';
import { execSync } from 'child_process';

const BACKUP_DIR = process.env.BACKUP_DIR || './backups';

export const POST = withAuth(async (request: AuthenticatedRequest) => {
  const { limited, resetMs } = rateLimit(request, { windowMs: 60_000, max: 2 });
  if (limited) return rateLimitResponse(resetMs);

  try {
    const { filename } = await request.json();

    if (!filename || typeof filename !== 'string') {
      return NextResponse.json({ error: 'filename is required' }, { status: 400 });
    }

    // Prevent path traversal
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return NextResponse.json({ error: 'Invalid filename' }, { status: 400 });
    }

    const backupPath = join(BACKUP_DIR, filename);
    if (!existsSync(backupPath)) {
      return NextResponse.json({ error: 'Backup file not found' }, { status: 404 });
    }

    // Extract db path from DATABASE_URL
    const dbUrl = process.env.DATABASE_URL || 'file:./db/custom.db';
    const dbFile = dbUrl.replace('file:', '');

    // Decompress backup to temp file
    const tempRestore = `/tmp/netoptima_restore_${Date.now()}.db`;
    await pipeline(
      createReadStream(backupPath),
      createGunzip(),
      createWriteStream(tempRestore)
    );

    // Verify the restored file is a valid SQLite database
    try {
      execSync(`sqlite3 "${tempRestore}" "SELECT count(*) FROM sqlite_master"`);
    } catch {
      execSync(`rm -f "${tempRestore}"`);
      return NextResponse.json({ error: 'Backup file is not a valid SQLite database' }, { status: 400 });
    }

    // Replace the current database
    execSync(`cp "${dbFile}" "${dbFile}.pre-restore-${Date.now()}"`);
    execSync(`mv "${tempRestore}" "${dbFile}"`);

    return NextResponse.json({
      success: true,
      message: `Database restored from ${filename}`,
      preRestoreBackup: `${dbFile}.pre-restore-${Date.now()}`,
    });
  } catch (error: unknown) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
});
