import { readFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

import { describe, expect, it } from 'vitest';

describe('@eridu/ui package metadata', () => {
  it('keeps JavaScript tree-shakeable while preserving the global stylesheet', () => {
    const packageJson = JSON.parse(
      readFileSync(path.join(process.cwd(), 'package.json'), 'utf8'),
    ) as { sideEffects?: string[] };

    expect(packageJson.sideEffects).toEqual(['./dist/styles/globals.css']);
  });
});
