import { spawnSync } from 'node:child_process';
import { existsSync, rmSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const appDir = process.cwd();
const snapshotDir = resolve(appDir, 'dist-pagefind-snapshot');
const snapshotClientDir = resolve(snapshotDir, 'client');
const pagefindOutputDir = resolve(appDir, 'dist', 'client', 'pagefind');

rmSync(snapshotDir, { recursive: true, force: true });
rmSync(pagefindOutputDir, { recursive: true, force: true });

const snapshotBuild = spawnSync('pnpm', ['astro', 'build'], {
  cwd: appDir,
  env: {
    ...process.env,
    BYPASS_AUTH: 'true',
    PAGEFIND_SNAPSHOT_BUILD: 'true',
  },
  stdio: 'inherit',
});

if (snapshotBuild.status !== 0) {
  process.exit(snapshotBuild.status ?? 1);
}

if (!existsSync(snapshotClientDir)) {
  throw new Error(`Missing Pagefind snapshot client directory: ${snapshotClientDir}`);
}

const localRequire = createRequire(import.meta.url);
const starlightEntry = localRequire.resolve('@astrojs/starlight');
const pagefindEntry = resolve(
  dirname(starlightEntry),
  '../../pagefind/lib/index.js',
);
const pagefind = await import(pathToFileURL(pagefindEntry).href);

try {
  const newIndexResponse = await pagefind.createIndex();

  if (newIndexResponse.errors.length > 0) {
    throw new Error(newIndexResponse.errors.join('\n'));
  }

  const { index } = newIndexResponse;
  const indexingResponse = await index.addDirectory({ path: snapshotClientDir });

  if (indexingResponse.errors.length > 0) {
    throw new Error(indexingResponse.errors.join('\n'));
  }

  const writeFilesResponse = await index.writeFiles({
    outputPath: pagefindOutputDir,
  });

  if (writeFilesResponse.errors.length > 0) {
    throw new Error(writeFilesResponse.errors.join('\n'));
  }
} finally {
  await pagefind.close();
  rmSync(snapshotDir, { recursive: true, force: true });
}
