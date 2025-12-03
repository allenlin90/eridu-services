import { migrate } from 'drizzle-orm/node-postgres/migrator';

import { db } from '@/db';
import env from '@/env';
import config from '$/drizzle.config';

if (!env.DB_MIGRATING) {
  throw new Error(
    'You must set DB_MIGRATING to "true" when running migrations',
  );
}

await migrate(db, { migrationsFolder: config.out! });
// @ts-expect-error - drizzle client end method may not be in type definitions
await db.$client.end();
