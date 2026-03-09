import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

function listTsFiles(dir: string): string[] {
  const entries = readdirSync(dir);
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const stats = statSync(fullPath);

    if (stats.isDirectory()) {
      files.push(...listTsFiles(fullPath));
      continue;
    }

    if (entry.endsWith('.ts') && !entry.endsWith('.spec.ts')) {
      files.push(fullPath);
    }
  }

  return files;
}

describe('zod date pattern consistency', () => {
  it('does not use z.coerce.date() in erify_api source', () => {
    const root = join(__dirname, '..');
    const tsFiles = listTsFiles(root);
    const offenders: string[] = [];

    for (const file of tsFiles) {
      const content = readFileSync(file, 'utf8');
      if (content.includes('z.coerce.date(')) {
        offenders.push(file);
      }
    }

    expect(offenders).toEqual([]);
  });
});
