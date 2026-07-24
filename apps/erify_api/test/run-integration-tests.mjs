import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const testDatabaseUrl = process.env.ERIFY_API_TEST_DATABASE_URL;

if (!testDatabaseUrl) {
  throw new Error(
    'ERIFY_API_TEST_DATABASE_URL is required. Refusing to use DATABASE_URL for integration tests.',
  );
}

const parsedTestDatabaseUrl = new URL(testDatabaseUrl);
const databaseName = decodeURIComponent(
  parsedTestDatabaseUrl.pathname.replace(/^\//, ''),
);
const isLoopbackHost = ['127.0.0.1', '::1', 'localhost'].includes(
  parsedTestDatabaseUrl.hostname,
);

if (!['postgres:', 'postgresql:'].includes(parsedTestDatabaseUrl.protocol)) {
  throw new Error('ERIFY_API_TEST_DATABASE_URL must use PostgreSQL.');
}

if (!databaseName.endsWith('_test')) {
  throw new Error(
    `Integration database name must end in "_test"; received "${databaseName}".`,
  );
}

if (!isLoopbackHost) {
  throw new Error(
    `Integration database must be local; received host "${parsedTestDatabaseUrl.hostname}".`,
  );
}

if (
  process.env.DATABASE_URL
  && new URL(process.env.DATABASE_URL).href === parsedTestDatabaseUrl.href
) {
  throw new Error(
    'ERIFY_API_TEST_DATABASE_URL must not match the existing DATABASE_URL.',
  );
}

const testDirectory = path.dirname(fileURLToPath(import.meta.url));
const appDirectory = path.resolve(testDirectory, '..');
const testEnvironment = {
  ...process.env,
  DATABASE_URL: parsedTestDatabaseUrl.href,
  NODE_ENV: 'test',
  ERIDU_AUTH_URL: process.env.ERIDU_AUTH_URL ?? 'http://localhost:3001',
};

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: appDirectory,
    env: testEnvironment,
    stdio: 'inherit',
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

run('pnpm', ['exec', 'prisma', 'migrate', 'deploy']);
run('pnpm', [
  'exec',
  'jest',
  '--config',
  'test/jest-integration.config.js',
  '--runInBand',
]);
