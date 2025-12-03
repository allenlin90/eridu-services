import { sql } from 'drizzle-orm';

import { db } from '@/db';
import env from '@/env';

if (!env.DB_MIGRATING) {
  throw new Error('You must set DB_MIGRATING to "true" when running drop');
}

/**
 * Drop script for removing all database tables
 *
 * This script drops all tables in the database, useful for:
 * - Resetting the database during development
 * - Preparing for fresh migrations
 * - Cleaning up before re-running migrations
 *
 * Usage:
 *   pnpm db:drop
 *
 * Warning: This will delete ALL tables and data in the database!
 */

async function drop() {
  console.log('🗑️  Starting database drop (all tables will be removed)...');

  try {
    // Get all table names from the public schema
    const tablesResult = await db.execute(sql`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public'
      ORDER BY tablename;
    `);

    const tables = tablesResult.rows as Array<{ tablename: string }>;

    // Also drop the drizzle migrations schema to reset migration state
    console.log('🗑️  Dropping drizzle migrations schema...');
    await db.execute(sql`DROP SCHEMA IF EXISTS drizzle CASCADE;`);
    console.log('  ✓ Dropped drizzle migrations schema');

    if (tables.length === 0) {
      console.log(
        '✅ No tables found in public schema. Database is already empty.',
      );
      console.log('\n✨ Database drop completed successfully!');
      console.log(
        '💡 You can now run `pnpm db:migrate` to recreate the schema.',
      );
      return;
    }

    console.log(`\n📋 Found ${tables.length} table(s) to drop:`);
    tables.forEach((table) => {
      console.log(`  - ${table.tablename}`);
    });

    // Disable foreign key checks temporarily by dropping tables in the right order
    // or use CASCADE to drop dependent objects
    console.log('\n🗑️  Dropping all tables...');

    // Drop all tables with CASCADE to handle foreign key constraints
    await db.execute(sql`
      DO $$ DECLARE
        r RECORD;
      BEGIN
        FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
          EXECUTE 'DROP TABLE IF EXISTS public.' || quote_ident(r.tablename) || ' CASCADE';
        END LOOP;
      END $$;
    `);

    console.log(`\n✅ Successfully dropped ${tables.length} table(s)`);
    console.log('\n✨ Database drop completed successfully!');
    console.log('💡 You can now run `pnpm db:migrate` to recreate the schema.');
  } catch (error) {
    console.error('❌ Error dropping database:', error);
    throw error;
  } finally {
    // @ts-expect-error - drizzle client end method may not be in type definitions
    await db.$client.end();
  }
}

drop().catch((error) => {
  console.error('Fatal error during drop:', error);
  process.exit(1);
});
