import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';

import env from '@/env';
import * as schema from './schema';

export const db = drizzle({
  casing: 'snake_case',
  connection: {
    connectionString: env.DATABASE_URL,
    max: env.DB_MIGRATING || env.DB_SEEDING ? 1 : undefined,
  },
  logger: true,
  schema,
});

export type db = typeof db;

export default db;
