import { PrismaClient } from '@prisma/client';
import { nanoid } from 'nanoid';

// initialize Prisma Client
const prisma = new PrismaClient();

// UID generation helper function matching the service pattern
function generateBrandedId(prefix: string, size: number = 20): string {
  return `${prefix}_${nanoid(size)}`;
}

// Check if database is already seeded with complete reference data
async function isDatabaseSeeded(): Promise<boolean> {
  try {
    // Check for specific expected records rather than just counts
    const [showTypes, showStatuses, showStandards] = await Promise.all([
      prisma.showType.findMany({
        where: {
          name: {
            in: ['bau', 'campaign', 'other'],
          },
        },
      }),
      prisma.showStatus.findMany({
        where: {
          name: {
            in: ['draft', 'confirmed', 'live', 'completed', 'cancelled'],
          },
        },
      }),
      prisma.showStandard.findMany({
        where: {
          name: {
            in: ['standard', 'premium'],
          },
        },
      }),
    ]);

    // Check if we have all expected records
    const hasAllShowTypes = showTypes.length === 3;
    const hasAllShowStatuses = showStatuses.length === 5;
    const hasAllShowStandards = showStandards.length === 2;

    const isComplete =
      hasAllShowTypes && hasAllShowStatuses && hasAllShowStandards;

    if (!isComplete) {
      console.log('🔍 Incomplete seeding detected:');
      console.log(
        `  - ShowTypes: ${showTypes.length}/3 (${hasAllShowTypes ? '✅' : '❌'})`,
      );
      console.log(
        `  - ShowStatuses: ${showStatuses.length}/5 (${hasAllShowStatuses ? '✅' : '❌'})`,
      );
      console.log(
        `  - ShowStandards: ${showStandards.length}/2 (${hasAllShowStandards ? '✅' : '❌'})`,
      );
    }

    return isComplete;
  } catch (error) {
    console.error('❌ Error checking database seeding status:', error);
    return false;
  }
}

async function main() {
  console.log('🌱 Starting seed process...');

  // Check if database is already seeded
  const isSeeded = await isDatabaseSeeded();
  if (isSeeded) {
    console.log('✅ Database is already seeded with complete reference data');
    console.log('⏭️  Skipping seed process to avoid duplicates');
    return;
  }

  console.log(
    '📊 Database appears to be empty or incomplete, proceeding with seeding...',
  );

  try {
    // Use transaction to ensure atomicity - either all data is seeded or none
    await prisma.$transaction(async (tx) => {
      // Seed ShowType data
      console.log('📺 Seeding ShowType data...');
      const showTypes = [
        {
          name: 'bau',
          metadata: {
            description: 'Business as Usual - Regular scheduled shows',
          },
        },
        {
          name: 'campaign',
          metadata: {
            description: 'Campaign-specific shows for marketing initiatives',
          },
        },
        {
          name: 'other',
          metadata: {
            description: 'Other types of shows not covered by BAU or campaign',
          },
        },
      ];

      for (const showType of showTypes) {
        await tx.showType.upsert({
          where: { name: showType.name },
          update: {},
          create: {
            uid: generateBrandedId('sht'),
            name: showType.name,
            metadata: showType.metadata,
          },
        });
        console.log(`✅ Created/updated ShowType: ${showType.name}`);
      }

      // Seed ShowStatus data
      console.log('📊 Seeding ShowStatus data...');
      const showStatuses = [
        {
          name: 'draft',
          metadata: {
            description: 'Show is in draft state, not yet confirmed',
            order: 1,
          },
        },
        {
          name: 'confirmed',
          metadata: {
            description: 'Show is confirmed and ready to go live',
            order: 2,
          },
        },
        {
          name: 'live',
          metadata: {
            description: 'Show is currently live/streaming',
            order: 3,
          },
        },
        {
          name: 'completed',
          metadata: { description: 'Show has finished successfully', order: 4 },
        },
        {
          name: 'cancelled',
          metadata: { description: 'Show was cancelled', order: 5 },
        },
      ];

      for (const showStatus of showStatuses) {
        await tx.showStatus.upsert({
          where: { name: showStatus.name },
          update: {},
          create: {
            uid: generateBrandedId('shs'),
            name: showStatus.name,
            metadata: showStatus.metadata,
          },
        });
        console.log(`✅ Created/updated ShowStatus: ${showStatus.name}`);
      }

      // Seed ShowStandard data
      console.log('⭐ Seeding ShowStandard data...');
      const showStandards = [
        {
          name: 'standard',
          metadata: { description: 'Standard production quality', tier: 1 },
        },
        {
          name: 'premium',
          metadata: {
            description: 'Premium production quality with enhanced features',
            tier: 2,
          },
        },
      ];

      for (const showStandard of showStandards) {
        await tx.showStandard.upsert({
          where: { name: showStandard.name },
          update: {},
          create: {
            uid: generateBrandedId('shs'),
            name: showStandard.name,
            metadata: showStandard.metadata,
          },
        });
        console.log(`✅ Created/updated ShowStandard: ${showStandard.name}`);
      }
    });

    console.log('🎉 Seed process completed successfully!');
  } catch (error) {
    console.error('❌ Seed process failed:', error);
    console.log(
      '🔄 Database transaction was rolled back - no partial data was saved',
    );
    throw error; // Re-throw to ensure process exits with error code
  }
}

// execute the main function
void main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    // close Prisma Client at the end
    await prisma.$disconnect();
  });
