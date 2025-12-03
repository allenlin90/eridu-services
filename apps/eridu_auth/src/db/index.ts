import 'dotenv/config';

import { drizzle } from 'drizzle-orm/node-postgres';

import * as schema from './schema';

import env from '@/env';

export const db = drizzle({
  casing: 'snake_case',
  connection: {
    connectionString: env.DATABASE_URL,
    max: env.DB_MIGRATING || env.DB_SEEDING ? 1 : undefined,
  },
  logger: true,
  schema,
});

export type Db = typeof db;

export default db;
