import 'dotenv/config';
import * as fs from 'fs';
import * as path from 'path';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { nanoid, customAlphabet } from 'nanoid';

// Auth User ID format: 32-character random alphanumeric string
const generateAuthUserId = customAlphabet('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789', 32);

type Args = {
  apply: boolean;
  allowProduction: boolean;
  csvPath: string;
  authDbUrl?: string;
  apiDbUrl?: string;
};

type CsvRecord = {
  nickName: string;
  name: string;
  type: string;
  rateHr: string;
  email: string;
  note: string;
};

function parseArgs(): Args {
  const args = process.argv.slice(2);
  let apply = false;
  let allowProduction = false;
  let csvPath = 'MC List - ชีต1.csv';
  let authDbUrl: string | undefined;
  let apiDbUrl: string | undefined;

  for (const arg of args) {
    if (arg === '--apply') {
      apply = true;
    } else if (arg === '--allow-production') {
      allowProduction = true;
    } else if (arg.startsWith('--csv-path=')) {
      csvPath = arg.split('=')[1];
    } else if (arg.startsWith('--auth-db-url=')) {
      authDbUrl = arg.split('=')[1];
    } else if (arg.startsWith('--api-db-url=')) {
      apiDbUrl = arg.split('=')[1];
    }
  }

  return { apply, allowProduction, csvPath, authDbUrl, apiDbUrl };
}

function ensureLocalDatabase(url: string | undefined, allowProd: boolean, label: string): void {
  if (!url) {
    throw new Error(`Database URL for ${label} is not defined`);
  }
  const isLocal = /(localhost|127\.0\.0\.1|::1)/.test(url);
  if (!isLocal && !allowProd) {
    throw new Error(
      `Database URL for ${label} ("${url}") does not look like a local database. Run with --allow-production to bypass this safety guard.`
    );
  }
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result.map(v => v.replace(/^"|"$/g, '').trim());
}

function loadCsvRecords(filePath: string): CsvRecord[] {
  if (!fs.existsSync(filePath)) {
    throw new Error(`CSV file not found at path: ${filePath}`);
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split(/\r?\n/).filter(line => line.trim() !== '');
  if (lines.length < 2) {
    return [];
  }

  // Parse header to map index to key
  const headers = parseCsvLine(lines[0]);
  const records: CsvRecord[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCsvLine(lines[i]);
    const record: any = {};
    headers.forEach((header, index) => {
      const val = values[index] !== undefined ? values[index] : '';
      if (header === 'Nick Name') record.nickName = val;
      else if (header === 'Name') record.name = val;
      else if (header === 'Type') record.type = val;
      else if (header === 'Rate/hr') record.rateHr = val;
      else if (header === 'Email') record.email = val;
      else if (header === 'Note') record.note = val;
    });
    records.push(record as CsvRecord);
  }

  return records;
}

function isValidEmail(email: string | undefined): boolean {
  if (!email) return false;
  const cleaned = email.trim().toLowerCase();
  return cleaned.includes('@') && !cleaned.includes('ไม่พบข้อมูล');
}

function normalizeName(name: string): string {
  return name.trim().replace(/[\s\t]+/g, ' ');
}

async function main() {
  const { apply, allowProduction, csvPath, authDbUrl, apiDbUrl } = parseArgs();

  // Resolve CSV path
  const potentialPaths = [
    path.resolve(csvPath),
    path.resolve(process.cwd(), csvPath),
    path.resolve(__dirname, csvPath),
    path.resolve(__dirname, '..', csvPath),
    path.resolve(__dirname, '..', '..', csvPath),
    path.resolve(__dirname, '..', '..', '..', csvPath),
  ];
  let resolvedCsvPath = '';
  for (const p of potentialPaths) {
    if (fs.existsSync(p)) {
      resolvedCsvPath = p;
      break;
    }
  }
  if (!resolvedCsvPath) {
    resolvedCsvPath = path.resolve(process.cwd(), csvPath); // fallback to report error
  }

  console.log(`Loading CSV from: ${resolvedCsvPath}`);
  const csvRecords = loadCsvRecords(resolvedCsvPath);
  console.log(`Loaded ${csvRecords.length} records from CSV.`);

  // Resolve Database URLs
  const resolvedApiDbUrl = apiDbUrl || process.env.DATABASE_URL;
  const resolvedAuthDbUrl = authDbUrl || process.env.ERIDU_AUTH_DATABASE_URL;

  // DB safety guards
  ensureLocalDatabase(resolvedApiDbUrl, allowProduction, 'erify_api (DATABASE_URL)');
  ensureLocalDatabase(resolvedAuthDbUrl, allowProduction, 'eridu_auth (ERIDU_AUTH_DATABASE_URL)');

  // Connect to databases
  const apiPool = new Pool({ connectionString: resolvedApiDbUrl });
  const apiAdapter = new PrismaPg(apiPool);
  const prisma = new PrismaClient({ adapter: apiAdapter });

  const authPool = new Pool({ connectionString: resolvedAuthDbUrl });

  console.log(`\n--- MC List Import Mode: ${apply ? 'APPLY' : 'DRY-RUN'} ---`);
  if (!apply) {
    console.log('Running in dry-run mode. No changes will be written to the databases.');
  }

  try {
    // 1. Analyze emails in CSV to find duplicates
    const emailCounts = new Map<string, number>();
    for (const record of csvRecords) {
      if (isValidEmail(record.email)) {
        const normalizedEmail = record.email.trim().toLowerCase();
        emailCounts.set(normalizedEmail, (emailCounts.get(normalizedEmail) || 0) + 1);
      }
    }

    // 2. Fetch existing creators and users from API DB for matching
    const activeCreators = await prisma.creator.findMany({
      where: { deletedAt: null },
    });
    console.log(`Loaded ${activeCreators.length} active creators from database.`);

    const norm = (s: string) => s.trim().toLowerCase().replace(/[\s\t]+/g, ' ');

    let createdCreatorsCount = 0;
    let updatedCreatorsCount = 0;
    let createdUsersCount = 0;
    let updatedUsersCount = 0;

    // We process each CSV record
    for (let index = 0; index < csvRecords.length; index++) {
      const record = csvRecords[index];
      const rawName = record.name || '';
      const rawNickName = record.nickName || '';
      
      if (!rawName && !rawNickName) {
        console.warn(`[Row ${index + 2}] Skipping empty row.`);
        continue;
      }

      const name = normalizeName(rawName);
      const aliasName = normalizeName(rawNickName || rawName);
      const rawEmail = record.email || '';
      const email = rawEmail.trim().toLowerCase();
      const hasValidEmail = isValidEmail(rawEmail);
      const isUniqueEmail = hasValidEmail && (emailCounts.get(email) === 1);
      
      const creatorType = (record.type || '').trim().toLowerCase() === 'flexible' ? 'FLEXIBLE' : 'STANDARD';
      const rateVal = parseFloat(record.rateHr);
      const defaultRate = isNaN(rateVal) ? null : rateVal * 2;
      const note = (record.note || '').trim();

      console.log(`\n[Row ${index + 2}] Processing: "${name}" (${aliasName})`);

      let apiUserId: bigint | null = null;
      let authUserId: string | null = null;
      let existingApiUser: any = null;

      // Handle User Creation/Linkage if email is unique
      if (isUniqueEmail) {
        // A. Check auth DB
        const authUserQuery = await authPool.query<{ id: string; name: string }>(
          'SELECT id, name FROM "user" WHERE email = $1 LIMIT 1',
          [email]
        );
        const existingAuthUser = authUserQuery.rows[0];

        if (existingAuthUser) {
          authUserId = existingAuthUser.id;
          console.log(`  - Found existing auth user: ${email} (ID: ${authUserId})`);
          if (existingAuthUser.name !== name) {
            console.log(`  - Will align auth name from "${existingAuthUser.name}" to "${name}"`);
            if (apply) {
              await authPool.query(
                'UPDATE "user" SET name = $1, updated_at = NOW() WHERE id = $2',
                [name, authUserId]
              );
            }
            updatedUsersCount++;
          }
        } else {
          authUserId = generateAuthUserId();
          console.log(`  - Will create new auth user: ${email} (ID: ${authUserId})`);
          if (apply) {
            await authPool.query(
              'INSERT INTO "user" (id, name, email, email_verified, role, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, NOW(), NOW())',
              [authUserId, name, email, true, 'user']
            );
          }
          createdUsersCount++;
        }

        // B. Check API DB
        existingApiUser = await prisma.user.findFirst({
          where: { email },
          include: { creator: true },
        });

        if (existingApiUser) {
          apiUserId = existingApiUser.id;
          console.log(`  - Found existing API user: ${email} (UID: ${existingApiUser.uid})`);
          
          let needsUpdate = false;
          const updateData: any = {};

          if (existingApiUser.name !== name) {
            updateData.name = name;
            needsUpdate = true;
          }
          if (existingApiUser.extId !== authUserId) {
            updateData.extId = authUserId;
            needsUpdate = true;
          }
          if (existingApiUser.deletedAt !== null) {
            updateData.deletedAt = null;
            needsUpdate = true;
          }

          if (needsUpdate) {
            console.log(`  - Will update API user profile alignment:`, updateData);
            if (apply) {
              await prisma.user.update({
                where: { id: existingApiUser.id },
                data: updateData,
              });
            }
            if (existingApiUser.name !== name) {
              updatedUsersCount++;
            }
          }
        } else {
          const newApiUserUid = `user_${nanoid(20)}`;
          console.log(`  - Will create new API user: ${email} (UID: ${newApiUserUid})`);
          if (apply) {
            const createdApiUser = await prisma.user.create({
              data: {
                uid: newApiUserUid,
                email,
                name,
                extId: authUserId,
              },
            });
            apiUserId = createdApiUser.id;
          }
          createdUsersCount++;
        }
      } else {
        if (!hasValidEmail) {
          console.log(`  - Blank or invalid email ("${rawEmail}"). Creator will have no user linkage.`);
        } else {
          console.log(`  - Duplicate email in CSV ("${email}"). Creator will have no user linkage.`);
        }
      }

      // Handle Creator Match / Creation
      let matchedCreator: any = null;
      if (isUniqueEmail && existingApiUser?.creator) {
        matchedCreator = existingApiUser.creator;
        console.log(`  - Matched creator by user relationship: "${matchedCreator.name}" (alias: "${matchedCreator.aliasName}", UID: ${matchedCreator.uid})`);
      } else {
        matchedCreator = activeCreators.find(c => norm(c.aliasName) === norm(aliasName));
        if (!matchedCreator) {
          matchedCreator = activeCreators.find(c => norm(c.name) === norm(name));
        }
      }

      // Check if another creator is already linked to this apiUserId to avoid unique constraint violations
      if (apiUserId) {
        const conflictingCreator = await prisma.creator.findFirst({
          where: {
            userId: apiUserId,
            id: matchedCreator ? { not: matchedCreator.id } : undefined,
            deletedAt: null,
          },
        });
        if (conflictingCreator) {
          console.log(`  - Warning: User ID ${apiUserId} is already linked to another creator "${conflictingCreator.name}" (UID: ${conflictingCreator.uid}). Clearing that linkage.`);
          if (apply) {
            await prisma.creator.update({
              where: { id: conflictingCreator.id },
              data: { user: { disconnect: true } },
            });
          }
        }
      }

      const creatorMetadata = {
        source: 'mc_list_csv',
        ...(note ? { note } : {}),
      };

      if (matchedCreator) {
        console.log(`  - Matched existing creator: "${matchedCreator.name}" (alias: "${matchedCreator.aliasName}", UID: ${matchedCreator.uid})`);
        
        const mergedMetadata = {
          ...(matchedCreator.metadata as Record<string, any> || {}),
          ...creatorMetadata,
        };

        console.log(`  - Will update creator details:`);
        console.log(`    - Name: "${name}"`);
        console.log(`    - Alias: "${aliasName}"`);
        console.log(`    - Type: ${creatorType}`);
        console.log(`    - Rate: ${defaultRate}`);
        console.log(`    - User ID Link: ${apiUserId ? apiUserId.toString() : 'null'}`);
        
        if (apply) {
          await prisma.creator.update({
            where: { id: matchedCreator.id },
            data: {
              name,
              aliasName,
              type: creatorType,
              defaultRate,
              defaultRateType: 'FIXED',
              defaultCommissionRate: null,
              metadata: mergedMetadata,
              user: apiUserId ? { connect: { id: apiUserId } } : { disconnect: true },
              deletedAt: null,
            },
          });
        }
        updatedCreatorsCount++;
      } else {
        const newCreatorUid = `creator_${nanoid(20)}`;
        console.log(`  - Will create new creator:`);
        console.log(`    - UID: ${newCreatorUid}`);
        console.log(`    - Name: "${name}"`);
        console.log(`    - Alias: "${aliasName}"`);
        console.log(`    - Type: ${creatorType}`);
        console.log(`    - Rate: ${defaultRate}`);
        console.log(`    - User ID Link: ${apiUserId ? apiUserId.toString() : 'null'}`);

        if (apply) {
          await prisma.creator.create({
            data: {
              uid: newCreatorUid,
              name,
              aliasName,
              type: creatorType,
              defaultRate,
              defaultRateType: 'FIXED',
              defaultCommissionRate: null,
              metadata: creatorMetadata,
              user: apiUserId ? { connect: { id: apiUserId } } : undefined,
            },
          });
        }
        createdCreatorsCount++;
      }
    }

    console.log(`\n--- Summary of Import ---`);
    console.log(`Creators: ${createdCreatorsCount} created, ${updatedCreatorsCount} updated`);
    console.log(`Users: ${createdUsersCount} created, ${updatedUsersCount} updated`);

  } catch (error) {
    console.error('An error occurred during import execution:', error);
  } finally {
    await prisma.$disconnect();
    await apiPool.end();
    await authPool.end();
  }
}

main().catch(err => {
  console.error('Fatal error in main wrapper:', err);
  process.exit(1);
});
