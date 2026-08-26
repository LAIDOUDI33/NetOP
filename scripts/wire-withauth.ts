import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

// Public routes that should NOT be wrapped
const PUBLIC_ROUTES = new Set([
  'health-check', 'metrics', 'auth/[...nextauth]', 'auth/seed'
]);

// Find all route.ts files
const { execSync } = await import('child_process');
const routeFiles = execSync('find src/app/api -name "route.ts"', { cwd: ROOT, encoding: 'utf-8' })
  .trim().split('\n').filter(Boolean);

const METHOD_RE = /^export async function (GET|POST|PUT|DELETE|PATCH)\s*\(([^)]*)\)\s*\{/;
const WITH_AUTH_IMPORT = "import { withAuth } from '@/lib/with-auth';";
const AUTH_REQ_IMPORT = "import { AuthenticatedRequest } from '@/lib/with-auth';";

let totalTransformed = 0;
let totalSkipped = 0;

for (const relPath of routeFiles) {
  const fullPath = join(ROOT, relPath);
  const routeKey = relPath
    .replace('src/app/api/', '')
    .replace('/route.ts', '');

  // Check if this route is public
  const isPublic = PUBLIC_ROUTES.has(routeKey);
  if (isPublic) {
    console.log(`  SKIP (public): ${routeKey}`);
    totalSkipped++;
    continue;
  }

  const content = readFileSync(fullPath, 'utf-8');

  // Skip if already has withAuth
  if (content.includes('withAuth')) {
    console.log(`  SKIP (already wired): ${routeKey}`);
    totalSkipped++;
    continue;
  }

  const lines = content.split('\n');
  let modified = false;
  const newLines: string[] = [];
  let needsWithAuthImport = false;
  let needsAuthReqImport = false;
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const match = line.match(METHOD_RE);

    if (match) {
      const method = match[1];
      const params = match[2].trim();

      // Determine if we need AuthenticatedRequest type
      const needsAuthType = params.includes('NextRequest') || params.includes('Request');
      if (needsAuthType) needsAuthReqImport = true;

      // Transform the request type to AuthenticatedRequest
      let newParams = params;
      if (params.includes('NextRequest')) {
        newParams = params.replace(/NextRequest/g, 'AuthenticatedRequest');
      } else if (params.includes('Request')) {
        newParams = params.replace(/Request/g, 'AuthenticatedRequest');
      }

      // Build the new declaration
      newLines.push(`export const ${method} = withAuth(async (${newParams}) => {`);
      needsWithAuthImport = true;
      modified = true;
    } else {
      newLines.push(line);
    }
    i++;
  }

  if (!modified) {
    console.log(`  SKIP (no matching exports): ${routeKey}`);
    totalSkipped++;
    continue;
  }

  // Find the last closing brace of each function and add the closing paren+semi
  // Strategy: find lines that are just '}' at column 0 and are the last line of a function
  // We need to track brace depth per function
  const finalLines: string[] = [];
  let braceDepth = 0;
  let inFunction = false;
  let functionStartLine = -1;

  for (let j = 0; j < newLines.length; j++) {
    const ln = newLines[j];
    const opens = (ln.match(/\{/g) || []).length;
    const closes = (ln.match(/\}/g) || []).length;

    if (ln.includes('withAuth(') && ln.includes('=> {')) {
      inFunction = true;
      functionStartLine = j;
      braceDepth = 0;
    }

    if (inFunction) {
      braceDepth += opens - closes;
      if (braceDepth <= 0 && j > functionStartLine) {
        // This is the closing brace of the withAuth function
        // Replace the closing } with });
        if (ln.trim() === '}') {
          finalLines.push('});');
        } else {
          finalLines.push(ln.replace(/\}\s*$/, '});'));
        }
        inFunction = false;
        braceDepth = 0;
        continue;
      }
    }

    finalLines.push(ln);
  }

  // Add imports
  const importSection: string[] = [];
  let importInserted = false;

  for (let j = 0; j < finalLines.length; j++) {
    const ln = finalLines[j];

    if (!importInserted && (ln.startsWith('import ') || ln.startsWith('//'))) {
      importSection.push(ln);
    } else {
      if (!importInserted && importSection.length > 0) {
        // Insert our imports after the last import
        if (needsWithAuthImport && !importSection.some(l => l.includes('with-auth'))) {
          importSection.push(WITH_AUTH_IMPORT);
        }
        if (needsAuthReqImport && !importSection.some(l => l.includes('AuthenticatedRequest') && !l.includes('with-auth'))) {
          importSection.push(AUTH_REQ_IMPORT);
        }
        importInserted = true;
      }
      importSection.push(ln);
    }
  }

  // If no imports were found, prepend
  if (!importInserted) {
    const prepended: string[] = [];
    if (needsWithAuthImport) prepended.push(WITH_AUTH_IMPORT);
    if (needsAuthReqImport) prepended.push(AUTH_REQ_IMPORT);
    prepended.push('');
    importSection.unshift(...prepended);
  }

  const finalContent = importSection.join('\n');
  writeFileSync(fullPath, finalContent, 'utf-8');
  console.log(`  ✓ WIRED: ${routeKey}`);
  totalTransformed++;
}

console.log(`\n═══════════════════════════════════`);
console.log(`Transformed: ${totalTransformed} routes`);
console.log(`Skipped: ${totalSkipped} routes`);
console.log(`═══════════════════════════════════`);
