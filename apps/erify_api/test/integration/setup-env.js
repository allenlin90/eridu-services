const testDatabaseUrl = process.env.DATABASE_URL;

if (!testDatabaseUrl) {
  throw new Error('DATABASE_URL was not set by the integration-test runner.');
}

const parsedTestDatabaseUrl = new URL(testDatabaseUrl);
const databaseName = decodeURIComponent(
  parsedTestDatabaseUrl.pathname.replace(/^\//, ''),
);

if (!databaseName.endsWith('_test')) {
  throw new Error(
    `Refusing to run integration tests against non-test database "${databaseName}".`,
  );
}

if (!['127.0.0.1', '::1', 'localhost'].includes(parsedTestDatabaseUrl.hostname)) {
  throw new Error(
    `Refusing to run integration tests against non-local host "${parsedTestDatabaseUrl.hostname}".`,
  );
}

process.env.NODE_ENV = 'test';
process.env.ERIDU_AUTH_URL ??= 'http://localhost:3001';
