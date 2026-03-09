import 'dotenv/config';

import { PrismaPg } from '@prisma/adapter-pg';
import type { Studio, User } from '@prisma/client';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';

import { fixtures, getClientUidByName } from './fixtures';

// Initialize Prisma Client with adapter
// eslint-disable-next-line
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL is not defined in environment variables');
}

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// Check if database is already seeded with complete reference data
async function isDatabaseSeeded(): Promise<boolean> {
  try {
    const now = new Date();
    const expectedMonthlySeededShows
      = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0),
      ).getUTCDate() * 3;

    // Check for specific expected records rather than just counts
    const [
      showTypes,
      showStatuses,
      showStandards,
      platforms,
      cancelledSystemStatus,
      clients,
      users,
      mcs,
      studios,
      studioMembershipCount,
      studioMcCount,
      studioShiftCount,
      studioShiftBlockCount,
      taskTemplateCount,
      usersWithExtIdCount,
      seededScheduleCount,
      seededShowCount,
    ] = await Promise.all([
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
      prisma.platform.findMany({
        where: {
          name: {
            in: ['shopee', 'lazada', 'tiktok'],
          },
        },
      }),
      prisma.showStatus.findFirst({
        where: {
          systemKey: 'CANCELLED',
          deletedAt: null,
        },
        select: { id: true },
      }),
      prisma.client.count(),
      prisma.user.count(),
      prisma.mC.count(),
      prisma.studio.findMany({
        where: {
          name: {
            in: ['Main Studio'],
          },
        },
      }),
      prisma.studioMembership.count(),
      prisma.studioMc.count(),
      prisma.studioShift.count(),
      prisma.studioShiftBlock.count(),
      prisma.taskTemplate.count(),
      prisma.user.count({
        where: {
          deletedAt: null,
          extId: { not: null },
        },
      }),
      prisma.schedule.count({
        where: {
          uid: {
            in: Object.values(fixtures.schedules),
          },
          deletedAt: null,
        },
      }),
      prisma.show.count({
        where: {
          externalId: {
            startsWith: 'seed_',
          },
          deletedAt: null,
        },
      }),
    ]);

    // Check if studio has all 10 rooms
    let hasAllRooms = false;
    if (studios.length > 0) {
      const studioId = studios[0].id;
      const rooms = await prisma.studioRoom.findMany({
        where: { studioId },
      });
      hasAllRooms = rooms.length === 10;
    }

    // Check if we have all expected records
    const hasAllShowTypes = showTypes.length === 3;
    const hasAllShowStatuses = showStatuses.length === 5;
    const hasAllShowStandards = showStandards.length === 2;
    const hasAllPlatforms = platforms.length === 3;
    const hasCancelledSystemStatus = Boolean(cancelledSystemStatus);
    const hasAllClients = clients >= 50;
    const hasAllUsers = users >= 31;
    const hasAllMCs = mcs >= 30;
    const hasAllStudios = studios.length === 1;
    const hasStudioMemberships = studioMembershipCount >= 4;
    const hasStudioMcs = studioMcCount >= 30;
    const hasStudioShifts = studioShiftCount >= 2;
    const hasStudioShiftBlocks = studioShiftBlockCount >= 3;

    const hasAllTaskTemplates = taskTemplateCount >= 50;
    const hasExtIdMappings = usersWithExtIdCount >= 31;
    const hasSeededSchedules = seededScheduleCount >= Object.values(fixtures.schedules).length;
    const hasSeededShows = seededShowCount >= expectedMonthlySeededShows;

    const isComplete
      = hasAllShowTypes
      && hasAllShowStatuses
      && hasAllShowStandards
      && hasAllPlatforms
      && hasCancelledSystemStatus
      && hasAllClients
      && hasAllUsers
      && hasAllMCs
      && hasAllStudios
      && hasStudioMemberships
      && hasStudioMcs
      && hasStudioShifts
      && hasStudioShiftBlocks
      && hasAllRooms
      && hasAllTaskTemplates
      && hasExtIdMappings
      && hasSeededSchedules
      && hasSeededShows;

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
      console.log(
        `  - Platforms: ${platforms.length}/3 (${hasAllPlatforms ? '✅' : '❌'})`,
      );
      console.log(
        `  - ShowStatus system key CANCELLED: ${hasCancelledSystemStatus ? '✅' : '❌'}`,
      );
      console.log(
        `  - Clients: ${clients}/50 (${hasAllClients ? '✅' : '❌'})`,
      );
      console.log(`  - Users: ${users}/31 (${hasAllUsers ? '✅' : '❌'})`);
      console.log(`  - MCs: ${mcs}/30 (${hasAllMCs ? '✅' : '❌'})`);
      console.log(
        `  - Studios: ${studios.length}/1 (${hasAllStudios ? '✅' : '❌'})`,
      );
      console.log(
        `  - StudioMemberships: ${studioMembershipCount}/4 (${hasStudioMemberships ? '✅' : '❌'})`,
      );
      console.log(
        `  - StudioMCs: ${studioMcCount}/30 (${hasStudioMcs ? '✅' : '❌'})`,
      );
      console.log(
        `  - StudioShifts: ${studioShiftCount}/2 (${hasStudioShifts ? '✅' : '❌'})`,
      );
      console.log(
        `  - StudioShiftBlocks: ${studioShiftBlockCount}/3 (${hasStudioShiftBlocks ? '✅' : '❌'})`,
      );
      console.log(`  - Studio Rooms: ${hasAllRooms ? '10/10 ✅' : '❌'}`);
      console.log(
        `  - TaskTemplates: ${taskTemplateCount}/50 (${hasAllTaskTemplates ? '✅' : '❌'})`,
      );
      console.log(
        `  - Users with ext_id: ${usersWithExtIdCount}/31 (${hasExtIdMappings ? '✅' : '❌'})`,
      );
      console.log(
        `  - Seeded Schedules: ${seededScheduleCount}/${Object.values(fixtures.schedules).length} (${hasSeededSchedules ? '✅' : '❌'})`,
      );
      console.log(
        `  - Seeded Shows: ${seededShowCount}/${expectedMonthlySeededShows} (${hasSeededShows ? '✅' : '❌'})`,
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
        const uidKey = showType.name as keyof typeof fixtures.showTypes;
        await tx.showType.upsert({
          where: { name: showType.name },
          update: {},
          create: {
            uid: fixtures.showTypes[uidKey],
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
          systemKey: 'CANCELLED',
          metadata: { description: 'Show was cancelled', order: 5 },
        },
      ];

      for (const showStatus of showStatuses) {
        const uidKey = showStatus.name as keyof typeof fixtures.showStatuses;
        await tx.showStatus.upsert({
          where: { name: showStatus.name },
          update: showStatus.systemKey
            ? { systemKey: showStatus.systemKey }
            : {},
          create: {
            uid: fixtures.showStatuses[uidKey],
            name: showStatus.name,
            systemKey: showStatus.systemKey,
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
        const uidKey = showStandard.name as keyof typeof fixtures.showStandards;
        await tx.showStandard.upsert({
          where: { name: showStandard.name },
          update: {},
          create: {
            uid: fixtures.showStandards[uidKey],
            name: showStandard.name,
            metadata: showStandard.metadata,
          },
        });
        console.log(`✅ Created/updated ShowStandard: ${showStandard.name}`);
      }

      // Seed Platform data
      console.log('🌐 Seeding Platform data...');
      const platforms = [
        {
          name: 'shopee',
          apiConfig: {},
          metadata: {},
        },
        {
          name: 'lazada',
          apiConfig: {},
          metadata: {},
        },
        {
          name: 'tiktok',
          apiConfig: {},
          metadata: {},
        },
      ];

      for (const platform of platforms) {
        const uidKey = platform.name as keyof typeof fixtures.platforms;
        const existingPlatform = await tx.platform.findFirst({
          where: { name: platform.name },
        });

        if (!existingPlatform) {
          await tx.platform.create({
            data: {
              uid: fixtures.platforms[uidKey],
              name: platform.name,
              apiConfig: platform.apiConfig,
              metadata: platform.metadata,
            },
          });
          console.log(`✅ Created Platform: ${platform.name}`);
        } else {
          console.log(`⏭️  Platform already exists: ${platform.name}`);
        }
      }

      // Seed Client data
      console.log('👔 Seeding Client data...');
      const clientCategories = [
        // Footwear & Fashion (10)
        {
          name: 'Nike',
          category: 'Athletic Footwear',
          industry: 'Sports & Lifestyle',
        },
        {
          name: 'Adidas',
          category: 'Athletic Footwear',
          industry: 'Sports & Lifestyle',
        },
        {
          name: 'Puma',
          category: 'Athletic Footwear',
          industry: 'Sports & Lifestyle',
        },
        {
          name: 'New Balance',
          category: 'Athletic Footwear',
          industry: 'Sports & Lifestyle',
        },
        {
          name: 'Converse',
          category: 'Casual Footwear',
          industry: 'Lifestyle & Fashion',
        },
        {
          name: 'Vans',
          category: 'Casual Footwear',
          industry: 'Lifestyle & Fashion',
        },
        {
          name: 'Reebok',
          category: 'Athletic Footwear',
          industry: 'Sports & Lifestyle',
        },
        {
          name: 'Under Armour',
          category: 'Athletic Apparel',
          industry: 'Sports & Lifestyle',
        },
        {
          name: 'Gucci',
          category: 'Luxury Fashion',
          industry: 'Fashion & Accessories',
        },
        {
          name: 'Zara',
          category: 'Fast Fashion',
          industry: 'Fashion & Retail',
        },
        // Tech & Electronics (10)
        {
          name: 'Apple',
          category: 'Consumer Electronics',
          industry: 'Technology',
        },
        {
          name: 'Samsung',
          category: 'Consumer Electronics',
          industry: 'Technology',
        },
        {
          name: 'Sony',
          category: 'Consumer Electronics',
          industry: 'Technology',
        },
        {
          name: 'Xiaomi',
          category: 'Consumer Electronics',
          industry: 'Technology',
        },
        {
          name: 'LG',
          category: 'Consumer Electronics',
          industry: 'Technology',
        },
        { name: 'HP', category: 'Computer Hardware', industry: 'Technology' },
        { name: 'Dell', category: 'Computer Hardware', industry: 'Technology' },
        {
          name: 'Lenovo',
          category: 'Computer Hardware',
          industry: 'Technology',
        },
        {
          name: 'Microsoft',
          category: 'Software & Hardware',
          industry: 'Technology',
        },
        { name: 'Intel', category: 'Semiconductors', industry: 'Technology' },
        // Beauty & Cosmetics (10)
        {
          name: 'L\'Oréal',
          category: 'Cosmetics',
          industry: 'Beauty & Personal Care',
        },
        {
          name: 'Maybelline',
          category: 'Cosmetics',
          industry: 'Beauty & Personal Care',
        },
        {
          name: 'MAC Cosmetics',
          category: 'Cosmetics',
          industry: 'Beauty & Personal Care',
        },
        {
          name: 'Estée Lauder',
          category: 'Luxury Cosmetics',
          industry: 'Beauty & Personal Care',
        },
        {
          name: 'Clinique',
          category: 'Skincare',
          industry: 'Beauty & Personal Care',
        },
        {
          name: 'The Body Shop',
          category: 'Natural Cosmetics',
          industry: 'Beauty & Personal Care',
        },
        {
          name: 'Sephora',
          category: 'Beauty Retail',
          industry: 'Beauty & Retail',
        },
        {
          name: 'Glossier',
          category: 'Beauty',
          industry: 'Beauty & Personal Care',
        },
        {
          name: 'Fenty Beauty',
          category: 'Cosmetics',
          industry: 'Beauty & Personal Care',
        },
        {
          name: 'Shiseido',
          category: 'Skincare',
          industry: 'Beauty & Personal Care',
        },
        // Food & Beverage (10)
        {
          name: 'Coca-Cola',
          category: 'Beverages',
          industry: 'Food & Beverage',
        },
        { name: 'Pepsi', category: 'Beverages', industry: 'Food & Beverage' },
        { name: 'Starbucks', category: 'Coffee', industry: 'Food & Beverage' },
        {
          name: 'McDonald\'s',
          category: 'Fast Food',
          industry: 'Food & Beverage',
        },
        { name: 'KFC', category: 'Fast Food', industry: 'Food & Beverage' },
        {
          name: 'Nestlé',
          category: 'Food Products',
          industry: 'Food & Beverage',
        },
        {
          name: 'Unilever',
          category: 'Consumer Goods',
          industry: 'Food & Beverage',
        },
        {
          name: 'Ben & Jerry\'s',
          category: 'Ice Cream',
          industry: 'Food & Beverage',
        },
        {
          name: 'Red Bull',
          category: 'Energy Drinks',
          industry: 'Food & Beverage',
        },
        {
          name: 'Tyson Foods',
          category: 'Food Products',
          industry: 'Food & Beverage',
        },
        // Home & Lifestyle (10)
        { name: 'IKEA', category: 'Furniture', industry: 'Home & Lifestyle' },
        {
          name: 'Home Depot',
          category: 'Home Improvement',
          industry: 'Home & Lifestyle',
        },
        { name: 'Target', category: 'Retail', industry: 'Home & Lifestyle' },
        { name: 'Walmart', category: 'Retail', industry: 'Home & Lifestyle' },
        {
          name: 'Amazon',
          category: 'E-commerce',
          industry: 'Retail & Technology',
        },
        { name: 'Costco', category: 'Wholesale Retail', industry: 'Retail' },
        {
          name: 'Nike Home',
          category: 'Home Decor',
          industry: 'Home & Lifestyle',
        },
        {
          name: 'Wayfair',
          category: 'Online Furniture',
          industry: 'Home & Lifestyle',
        },
        {
          name: 'Bed Bath & Beyond',
          category: 'Home Goods',
          industry: 'Home & Lifestyle',
        },
        {
          name: 'Williams-Sonoma',
          category: 'Kitchenware',
          industry: 'Home & Lifestyle',
        },
      ];

      let clientIndex = 0;
      for (const clientCat of clientCategories) {
        clientIndex++;
        const contactPerson = `${clientCat.name} Team`;
        const contactEmail = `contact@${clientCat.name
          .toLowerCase()
          .replace(/\s+/g, '')
          .replace(/[^a-z0-9]/g, '')}.com`;

        await tx.client.upsert({
          where: { name: clientCat.name },
          update: {},
          create: {
            uid: getClientUidByName(clientCat.name),
            name: clientCat.name,
            contactPerson,
            contactEmail,
            metadata: {
              category: clientCat.category,
              industry: clientCat.industry,
              description: `${clientCat.name} - ${clientCat.category} brand in ${clientCat.industry}`,
            },
          },
        });
        if (clientIndex % 10 === 0) {
          console.log(`✅ Created/updated ${clientIndex} clients...`);
        }
      }
      console.log(`✅ Completed seeding ${clientIndex} clients`);

      // Seed User data
      console.log('👤 Seeding User data...');

      // Admin user
      const adminUser = await tx.user.upsert({
        where: { email: 'admin@example.com' },
        update: {
          extId: 'sso_admin_0001',
        },
        create: {
          uid: fixtures.users.admin,
          email: 'admin@example.com',
          extId: 'sso_admin_0001',
          name: 'Admin User',
          isSystemAdmin: true,
          metadata: {
            role: 'admin',
            department: 'Management',
          },
        },
      });
      console.log(`✅ Created/updated Admin User: ${adminUser.name}`);

      // 30 MC users
      const createdUsers: User[] = [adminUser];
      const specializations = [
        'Fashion Shows',
        'Tech Product Launches',
        'Beauty & Cosmetics',
        'Sports & Fitness',
        'Food & Beverage',
        'General Entertainment',
        'Lifestyle Products',
        'Gaming & Tech',
        'Fashion & Accessories',
        'Health & Wellness',
        'Home & Living',
        'Automotive',
        'Travel & Tourism',
        'Music & Arts',
        'Education',
      ];

      for (let i = 1; i <= 30; i++) {
        const specialization
          = specializations[(i - 1) % specializations.length];
        const experience = `${Math.floor(Math.random() * 10) + 1} years`;
        const uidKey = `mc${i}` as keyof typeof fixtures.users;
        const extId = `sso_mc_${String(i).padStart(4, '0')}`;
        const mcUser = await tx.user.upsert({
          where: { email: `mcuser${i}@example.com` },
          update: {
            extId,
          },
          create: {
            uid: fixtures.users[uidKey],
            email: `mcuser${i}@example.com`,
            extId,
            name: `MC User ${i}`,
            metadata: {
              role: 'MC',
              department: 'Entertainment',
              specialization,
              experience,
            },
          },
        });
        createdUsers.push(mcUser);
        if (i % 10 === 0) {
          console.log(`✅ Created/updated ${i} MC users...`);
        }
      }
      console.log(
        `✅ Completed seeding ${createdUsers.length} users (1 admin + 30 MC users)`,
      );

      const studioTestAdminUser = await tx.user.upsert({
        where: { email: 'test-admin@example.com' },
        update: {
          extId: 'sso_test_admin_0001',
          isSystemAdmin: true,
        },
        create: {
          uid: fixtures.users.testAdmin,
          email: 'test-admin@example.com',
          extId: 'sso_test_admin_0001',
          name: 'Test Admin',
          isSystemAdmin: true,
          metadata: {
            role: 'admin',
            dataset: 'studio-role-testing',
          },
        },
      });

      const studioTestUser = await tx.user.upsert({
        where: { email: 'test-user@example.com' },
        update: {
          extId: 'sso_test_user_0001',
        },
        create: {
          uid: fixtures.users.testUser,
          email: 'test-user@example.com',
          extId: 'sso_test_user_0001',
          name: 'Test User',
          metadata: {
            role: 'user',
            dataset: 'studio-role-testing',
          },
        },
      });

      const studioTestUser2 = await tx.user.upsert({
        where: { email: 'test-user-2@example.com' },
        update: {
          extId: 'sso_test_user_0002',
        },
        create: {
          uid: fixtures.users.testUser2,
          email: 'test-user-2@example.com',
          extId: 'sso_test_user_0002',
          name: 'Test User 2',
          metadata: {
            role: 'user',
            dataset: 'studio-role-testing',
          },
        },
      });

      const studioTestUser3 = await tx.user.upsert({
        where: { email: 'test-user-3@example.com' },
        update: {
          extId: 'sso_test_user_0003',
        },
        create: {
          uid: fixtures.users.testUser3,
          email: 'test-user-3@example.com',
          extId: 'sso_test_user_0003',
          name: 'Test User 3',
          metadata: {
            role: 'user',
            dataset: 'studio-role-testing',
          },
        },
      });
      console.log('✅ Created/updated studio role-testing users (test-admin/test-user*)');

      // Seed MC data
      console.log('🎤 Seeding MC data...');
      const mcSpecializations = [
        'Fashion Shows',
        'Tech Product Launches',
        'Beauty & Cosmetics',
        'Sports & Fitness',
        'Food & Beverage',
        'General Entertainment',
        'Lifestyle Products',
        'Gaming & Tech',
        'Fashion & Accessories',
        'Health & Wellness',
      ];

      // Create 30 MCs, each linked to one of the 30 MC users (skip admin user at index 0)
      for (let i = 1; i <= 30; i++) {
        const specialization
          = mcSpecializations[(i - 1) % mcSpecializations.length];
        const experience = `${Math.floor(Math.random() * 10) + 1} years`;
        const mcName = `MC ${i}`;
        const aliasName = `MC${i}`;
        const mcUser = createdUsers[i]; // Skip admin at index 0
        const uidKey = `mc${i}` as keyof typeof fixtures.mcs;

        const existingMc = await tx.mC.findFirst({
          where: { name: mcName },
        });

        if (!existingMc) {
          await tx.mC.create({
            data: {
              uid: fixtures.mcs[uidKey],
              name: mcName,
              aliasName,
              userId: mcUser.id,
              metadata: {
                specialization,
                experience,
              },
            },
          });
          if (i % 10 === 0) {
            console.log(`✅ Created ${i} MCs...`);
          }
        } else {
          if (i % 10 === 0) {
            console.log(`⏭️  ${i} MCs already exist...`);
          }
        }
      }
      console.log(`✅ Completed seeding 30 MCs (all linked to MC users)`);

      // Seed Studio data
      console.log('🎬 Seeding Studio data...');
      const existingStudio = await tx.studio.findFirst({
        where: { name: 'Main Studio' },
      });

      let studio: Studio;
      if (!existingStudio) {
        studio = await tx.studio.create({
          data: {
            uid: fixtures.studios.mainStudio,
            name: 'Main Studio',
            address: '123 Production Street, Entertainment District',
            metadata: {
              description: 'Main production studio facility',
              location: 'Downtown',
            },
          },
        });
        console.log(`✅ Created Studio: ${studio.name}`);
      } else {
        studio = existingStudio;
        console.log(`⏭️  Studio already exists: ${studio.name}`);
      }

      // Seed StudioRoom data
      console.log('🚪 Seeding StudioRoom data...');
      const roomNames = [
        'Room A',
        'Room B',
        'Room C',
        'Room D',
        'Room E',
        'Room F',
        'Room G',
        'Room H',
        'Room I',
        'Room J',
      ];
      const roomUidKeys: (keyof typeof fixtures.studioRooms)[] = [
        'roomA',
        'roomB',
        'roomC',
        'roomD',
        'roomE',
        'roomF',
        'roomG',
        'roomH',
        'roomI',
        'roomJ',
      ];

      for (let i = 0; i < roomNames.length; i++) {
        const roomName = roomNames[i];
        const uidKey = roomUidKeys[i];
        const existingRoom = await tx.studioRoom.findFirst({
          where: {
            studioId: studio.id,
            name: roomName,
          },
        });

        if (!existingRoom) {
          await tx.studioRoom.create({
            data: {
              uid: fixtures.studioRooms[uidKey],
              studioId: studio.id,
              name: roomName,
              capacity: 20,
              metadata: {
                equipment: 'Full production setup',
                features: ['Live streaming', 'Recording', 'Editing'],
              },
            },
          });
          console.log(`✅ Created StudioRoom: ${roomName}`);
        } else {
          console.log(`⏭️  StudioRoom already exists: ${roomName}`);
        }
      }

      // Seed StudioMc roster data (studio-scoped creator pool)
      console.log('🎙️ Seeding StudioMc roster data...');
      const existingMcs = await tx.mC.findMany({
        where: { deletedAt: null },
        select: {
          id: true,
          defaultRate: true,
          defaultRateType: true,
          defaultCommissionRate: true,
        },
        orderBy: { id: 'asc' },
      });

      for (const [index, mc] of existingMcs.entries()) {
        const rosterUid = `smc_${String(index + 1).padStart(20, '0')}`;
        await tx.studioMc.upsert({
          where: {
            studioId_mcId: {
              studioId: studio.id,
              mcId: mc.id,
            },
          },
          update: {
            defaultRate: mc.defaultRate,
            defaultRateType: mc.defaultRateType,
            defaultCommissionRate: mc.defaultCommissionRate,
            isActive: true,
            metadata: {},
            deletedAt: null,
          },
          create: {
            uid: rosterUid,
            studioId: studio.id,
            mcId: mc.id,
            defaultRate: mc.defaultRate,
            defaultRateType: mc.defaultRateType,
            defaultCommissionRate: mc.defaultCommissionRate,
            isActive: true,
            metadata: {},
          },
        });
      }
      console.log(`✅ Completed seeding ${existingMcs.length} StudioMc roster records`);

      // Seed StudioMembership data
      console.log('👥 Seeding StudioMembership data...');
      const membershipSeeds = [
        {
          uid: fixtures.studioMemberships.testAdminMainStudio,
          userId: studioTestAdminUser.id,
          role: 'admin',
          baseHourlyRate: '40.00',
          metadata: {
            joinedDate: new Date().toISOString(),
            permissions: ['manage_studio', 'manage_rooms', 'view_reports'],
          },
          label: `${studioTestAdminUser.name} -> ${studio.name} (admin)`,
        },
        {
          uid: fixtures.studioMemberships.testUserMainStudio,
          userId: studioTestUser.id,
          role: 'admin',
          baseHourlyRate: '25.00',
          metadata: {
            joinedDate: new Date().toISOString(),
            permissions: ['view_schedule', 'manage_tasks', 'manage_studio'],
          },
          label: `${studioTestUser.name} -> ${studio.name} (admin)`,
        },
        {
          uid: fixtures.studioMemberships.testUser2MainStudio,
          userId: studioTestUser2.id,
          role: 'member',
          baseHourlyRate: '18.50',
          metadata: {
            joinedDate: new Date().toISOString(),
            permissions: ['view_schedule'],
          },
          label: `${studioTestUser2.name} -> ${studio.name} (member)`,
        },
        {
          uid: fixtures.studioMemberships.testUser3MainStudio,
          userId: studioTestUser3.id,
          role: 'talent_manager',
          baseHourlyRate: '22.00',
          metadata: {
            joinedDate: new Date().toISOString(),
            permissions: ['view_schedule', 'staffing'],
          },
          label: `${studioTestUser3.name} -> ${studio.name} (talent_manager)`,
        },
      ] as const;

      for (const membershipSeed of membershipSeeds) {
        const existingMembership = await tx.studioMembership.findFirst({
          where: {
            userId: membershipSeed.userId,
            studioId: studio.id,
          },
        });

        if (existingMembership) {
          await tx.studioMembership.update({
            where: { id: existingMembership.id },
            data: {
              role: membershipSeed.role,
              baseHourlyRate: membershipSeed.baseHourlyRate,
              metadata: membershipSeed.metadata,
            },
          });
          console.log(`♻️  Updated StudioMembership: ${membershipSeed.label}`);
          continue;
        }

        await tx.studioMembership.create({
          data: {
            uid: membershipSeed.uid,
            userId: membershipSeed.userId,
            studioId: studio.id,
            role: membershipSeed.role,
            baseHourlyRate: membershipSeed.baseHourlyRate,
            metadata: membershipSeed.metadata,
          },
        });
        console.log(`✅ Created StudioMembership: ${membershipSeed.label}`);
      }

      // Seed StudioShift data (sample records for local schedule UI/testing)
      console.log('🗓️ Seeding StudioShift data...');
      const today = new Date();
      const scheduleDate = new Date(Date.UTC(
        today.getUTCFullYear(),
        today.getUTCMonth(),
        today.getUTCDate(),
      ));

      const dutyShiftStart = new Date(scheduleDate);
      dutyShiftStart.setUTCHours(9, 0, 0, 0);
      const dutyShiftMid = new Date(scheduleDate);
      dutyShiftMid.setUTCHours(13, 0, 0, 0);
      const dutyShiftResume = new Date(scheduleDate);
      dutyShiftResume.setUTCHours(14, 0, 0, 0);
      const dutyShiftEnd = new Date(scheduleDate);
      dutyShiftEnd.setUTCHours(18, 0, 0, 0);

      const memberShiftStart = new Date(scheduleDate);
      memberShiftStart.setUTCHours(10, 0, 0, 0);
      const memberShiftEnd = new Date(scheduleDate);
      memberShiftEnd.setUTCHours(16, 0, 0, 0);
      const mcUser1 = createdUsers[1];
      const mcUser2 = createdUsers[2];

      const shiftSeeds = [
        {
          uid: fixtures.studioShifts.mc1CurrentDuty,
          userId: mcUser1.id,
          isDutyManager: true,
          hourlyRate: '25.00',
          projectedCost: '200.00',
          blocks: [
            {
              uid: fixtures.studioShiftBlocks.mc1CurrentDutyBlockMorning,
              startTime: dutyShiftStart,
              endTime: dutyShiftMid,
            },
            {
              uid: fixtures.studioShiftBlocks.mc1CurrentDutyBlockEvening,
              startTime: dutyShiftResume,
              endTime: dutyShiftEnd,
            },
          ],
        },
        {
          uid: fixtures.studioShifts.mc2CurrentShift,
          userId: mcUser2.id,
          isDutyManager: false,
          hourlyRate: '18.50',
          projectedCost: '111.00',
          blocks: [
            {
              uid: fixtures.studioShiftBlocks.mc2CurrentShiftBlock,
              startTime: memberShiftStart,
              endTime: memberShiftEnd,
            },
          ],
        },
      ] as const;

      for (const shiftSeed of shiftSeeds) {
        const existingShift = await tx.studioShift.findUnique({
          where: { uid: shiftSeed.uid },
        });

        const shift = existingShift
          ? await tx.studioShift.update({
              where: { id: existingShift.id },
              data: {
                studioId: studio.id,
                userId: shiftSeed.userId,
                date: scheduleDate,
                hourlyRate: shiftSeed.hourlyRate,
                projectedCost: shiftSeed.projectedCost,
                isDutyManager: shiftSeed.isDutyManager,
                status: 'SCHEDULED',
                metadata: {},
              },
            })
          : await tx.studioShift.create({
              data: {
                uid: shiftSeed.uid,
                studioId: studio.id,
                userId: shiftSeed.userId,
                date: scheduleDate,
                hourlyRate: shiftSeed.hourlyRate,
                projectedCost: shiftSeed.projectedCost,
                isDutyManager: shiftSeed.isDutyManager,
                status: 'SCHEDULED',
                metadata: {},
              },
            });

        for (const blockSeed of shiftSeed.blocks) {
          const existingBlock = await tx.studioShiftBlock.findUnique({
            where: { uid: blockSeed.uid },
          });

          if (existingBlock) {
            await tx.studioShiftBlock.update({
              where: { id: existingBlock.id },
              data: {
                shiftId: shift.id,
                startTime: blockSeed.startTime,
                endTime: blockSeed.endTime,
                metadata: {},
              },
            });
          } else {
            await tx.studioShiftBlock.create({
              data: {
                uid: blockSeed.uid,
                shiftId: shift.id,
                startTime: blockSeed.startTime,
                endTime: blockSeed.endTime,
                metadata: {},
              },
            });
          }
        }
      }
      console.log('✅ Completed seeding studio shifts and shift blocks');

      // Seed Schedule + Show data for local testing (replaces manual-test dependency)
      console.log('📅 Seeding Schedule + Show data...');
      const scheduleStart = new Date(Date.UTC(
        today.getUTCFullYear(),
        today.getUTCMonth(),
        1,
        0,
        0,
        0,
        0,
      ));
      const scheduleEnd = new Date(Date.UTC(
        today.getUTCFullYear(),
        today.getUTCMonth() + 1,
        0,
        23,
        59,
        59,
        999,
      ));

      const clients = await tx.client.findMany({
        where: {
          uid: {
            in: [
              fixtures.clients.nike,
              fixtures.clients.adidas,
              fixtures.clients.puma,
            ],
          },
          deletedAt: null,
        },
        select: { id: true, uid: true, name: true },
      });
      const clientByUid = new Map(clients.map((client) => [client.uid, client]));

      const rooms = await tx.studioRoom.findMany({
        where: {
          uid: {
            in: [
              fixtures.studioRooms.roomA,
              fixtures.studioRooms.roomB,
              fixtures.studioRooms.roomC,
            ],
          },
          deletedAt: null,
        },
        select: { id: true, uid: true },
      });
      const roomByUid = new Map(rooms.map((room) => [room.uid, room.id]));

      const showTypeRefs = await tx.showType.findMany({
        where: {
          uid: {
            in: [fixtures.showTypes.bau, fixtures.showTypes.campaign],
          },
          deletedAt: null,
        },
        select: { id: true, uid: true },
      });
      const showTypeByUid = new Map(showTypeRefs.map((type) => [type.uid, type.id]));

      const showStatusRefs = await tx.showStatus.findMany({
        where: {
          uid: {
            in: [
              fixtures.showStatuses.draft,
              fixtures.showStatuses.confirmed,
              fixtures.showStatuses.live,
            ],
          },
          deletedAt: null,
        },
        select: { id: true, uid: true },
      });
      const showStatusByUid = new Map(showStatusRefs.map((status) => [status.uid, status.id]));

      const showStandardRefs = await tx.showStandard.findMany({
        where: {
          uid: {
            in: [fixtures.showStandards.standard, fixtures.showStandards.premium],
          },
          deletedAt: null,
        },
        select: { id: true, uid: true },
      });
      const showStandardByUid = new Map(showStandardRefs.map((standard) => [standard.uid, standard.id]));

      const mcs = await tx.mC.findMany({
        where: {
          uid: {
            in: [
              fixtures.mcs.mc1,
              fixtures.mcs.mc2,
              fixtures.mcs.mc3,
              fixtures.mcs.mc4,
              fixtures.mcs.mc5,
              fixtures.mcs.mc6,
              fixtures.mcs.mc7,
              fixtures.mcs.mc8,
              fixtures.mcs.mc9,
            ],
          },
          deletedAt: null,
        },
        select: { id: true, uid: true },
      });
      const mcByUid = new Map(mcs.map((mc) => [mc.uid, mc.id]));

      const platformRefs = await tx.platform.findMany({
        where: {
          uid: {
            in: [
              fixtures.platforms.shopee,
              fixtures.platforms.tiktok,
              fixtures.platforms.lazada,
            ],
          },
          deletedAt: null,
        },
        select: { id: true, uid: true },
      });
      const platformByUid = new Map(platformRefs.map((platform) => [platform.uid, platform.id]));

      const scheduleSeeds = [
        {
          key: 'nikeCurrentMonth',
          uid: fixtures.schedules.nikeCurrentMonth,
          clientUid: fixtures.clients.nike,
          status: 'published',
        },
        {
          key: 'adidasCurrentMonth',
          uid: fixtures.schedules.adidasCurrentMonth,
          clientUid: fixtures.clients.adidas,
          status: 'published',
        },
        {
          key: 'pumaCurrentMonth',
          uid: fixtures.schedules.pumaCurrentMonth,
          clientUid: fixtures.clients.puma,
          status: 'published',
        },
      ] as const;

      const scheduleByKey = new Map<string, { id: bigint; clientUid: string }>();
      for (const scheduleSeed of scheduleSeeds) {
        const client = clientByUid.get(scheduleSeed.clientUid);
        if (!client) {
          throw new Error(`Missing client for schedule seed: ${scheduleSeed.clientUid}`);
        }

        const seededSchedule = await tx.schedule.upsert({
          where: { uid: scheduleSeed.uid },
          update: {
            name: `${client.name} Schedule - ${scheduleStart.toISOString().split('T')[0]}`,
            startDate: scheduleStart,
            endDate: scheduleEnd,
            status: scheduleSeed.status,
            publishedAt: scheduleSeed.status === 'published' ? new Date() : null,
            clientId: client.id,
            studioId: studio.id,
            createdBy: adminUser.id,
            publishedBy: scheduleSeed.status === 'published' ? adminUser.id : null,
            version: 1,
            planDocument: {
              metadata: {
                source: 'seed',
                clientName: client.name,
                dateRange: {
                  start: scheduleStart.toISOString(),
                  end: scheduleEnd.toISOString(),
                },
              },
              shows: [],
            },
            metadata: {
              source: 'seed',
              seeded: true,
            },
            deletedAt: null,
          },
          create: {
            uid: scheduleSeed.uid,
            name: `${client.name} Schedule - ${scheduleStart.toISOString().split('T')[0]}`,
            startDate: scheduleStart,
            endDate: scheduleEnd,
            status: scheduleSeed.status,
            publishedAt: scheduleSeed.status === 'published' ? new Date() : null,
            planDocument: {
              metadata: {
                source: 'seed',
                clientName: client.name,
                dateRange: {
                  start: scheduleStart.toISOString(),
                  end: scheduleEnd.toISOString(),
                },
              },
              shows: [],
            },
            version: 1,
            metadata: {
              source: 'seed',
              seeded: true,
            },
            clientId: client.id,
            studioId: studio.id,
            createdBy: adminUser.id,
            publishedBy: scheduleSeed.status === 'published' ? adminUser.id : null,
          },
          select: {
            id: true,
          },
        });

        scheduleByKey.set(scheduleSeed.key, {
          id: seededSchedule.id,
          clientUid: scheduleSeed.clientUid,
        });
      }

      const toShowDate = (day: number, startHour: number, endHour: number) => ({
        start: new Date(Date.UTC(
          scheduleStart.getUTCFullYear(),
          scheduleStart.getUTCMonth(),
          day,
          startHour,
          0,
          0,
          0,
        )),
        end: new Date(Date.UTC(
          scheduleStart.getUTCFullYear(),
          scheduleStart.getUTCMonth(),
          day,
          endHour,
          0,
          0,
          0,
        )),
      });

      const roomRotation = [
        fixtures.studioRooms.roomA,
        fixtures.studioRooms.roomB,
        fixtures.studioRooms.roomC,
      ] as const;
      const showTypeRotation = [
        fixtures.showTypes.bau,
        fixtures.showTypes.campaign,
      ] as const;
      const showStatusRotation = [
        fixtures.showStatuses.confirmed,
        fixtures.showStatuses.live,
        fixtures.showStatuses.draft,
      ] as const;
      const showStandardRotation = [
        fixtures.showStandards.standard,
        fixtures.showStandards.premium,
      ] as const;
      const monthlyClientSeeds = [
        { scheduleKey: 'nikeCurrentMonth', clientCode: 'nike' },
        { scheduleKey: 'adidasCurrentMonth', clientCode: 'adidas' },
        { scheduleKey: 'pumaCurrentMonth', clientCode: 'puma' },
      ] as const;
      const daysInMonth = scheduleEnd.getUTCDate();
      const showSeeds: Array<{
        key: string;
        uid: string;
        scheduleKey: string;
        externalId: string;
        roomUid: string;
        showTypeUid: string;
        showStatusUid: string;
        showStandardUid: string;
        start: Date;
        end: Date;
      }> = [];

      monthlyClientSeeds.forEach((clientSeed, clientIndex) => {
        for (let day = 1; day <= daysInMonth; day++) {
          const startHour = 8 + ((day + clientIndex) % 8);
          const endHour = startHour + 2;
          const dateWindow = toShowDate(day, startHour, endHour);
          showSeeds.push({
            key: `${clientSeed.clientCode}Show${day}`,
            uid: `show_seed_${clientSeed.clientCode}_${String(day).padStart(2, '0')}`,
            scheduleKey: clientSeed.scheduleKey,
            externalId: `seed_${clientSeed.clientCode}_show_${day}`,
            roomUid: roomRotation[(day + clientIndex) % roomRotation.length],
            showTypeUid: showTypeRotation[(day + clientIndex) % showTypeRotation.length],
            showStatusUid: showStatusRotation[(day + clientIndex) % showStatusRotation.length],
            showStandardUid: showStandardRotation[(day + clientIndex) % showStandardRotation.length],
            start: dateWindow.start,
            end: dateWindow.end,
          });
        }
      });

      const showByKey = new Map<string, bigint>();
      for (const showSeed of showSeeds) {
        const scheduleRef = scheduleByKey.get(showSeed.scheduleKey);
        if (!scheduleRef) {
          throw new Error(`Missing schedule for show seed: ${showSeed.scheduleKey}`);
        }
        const client = clientByUid.get(scheduleRef.clientUid);
        if (!client) {
          throw new Error(`Missing client for show seed: ${scheduleRef.clientUid}`);
        }

        const roomId = roomByUid.get(showSeed.roomUid);
        const showTypeId = showTypeByUid.get(showSeed.showTypeUid);
        const showStatusId = showStatusByUid.get(showSeed.showStatusUid);
        const showStandardId = showStandardByUid.get(showSeed.showStandardUid);
        if (!roomId || !showTypeId || !showStatusId || !showStandardId) {
          throw new Error(`Missing references for show seed: ${showSeed.uid}`);
        }

        const seededShow = await tx.show.upsert({
          where: {
            clientId_externalId: {
              clientId: client.id,
              externalId: showSeed.externalId,
            },
          },
          update: {
            name: `${client.name} ${showSeed.key}`,
            startTime: showSeed.start,
            endTime: showSeed.end,
            metadata: { source: 'seed', seeded: true },
            clientId: client.id,
            studioId: studio.id,
            studioRoomId: roomId,
            showTypeId,
            showStatusId,
            showStandardId,
            scheduleId: scheduleRef.id,
            deletedAt: null,
          },
          create: {
            uid: showSeed.uid,
            externalId: showSeed.externalId,
            name: `${client.name} ${showSeed.key}`,
            startTime: showSeed.start,
            endTime: showSeed.end,
            metadata: { source: 'seed', seeded: true },
            clientId: client.id,
            studioId: studio.id,
            studioRoomId: roomId,
            showTypeId,
            showStatusId,
            showStandardId,
            scheduleId: scheduleRef.id,
          },
          select: {
            id: true,
          },
        });

        showByKey.set(showSeed.key, seededShow.id);
      }

      const mcRotation = [
        fixtures.mcs.mc1,
        fixtures.mcs.mc2,
        fixtures.mcs.mc3,
        fixtures.mcs.mc4,
        fixtures.mcs.mc5,
        fixtures.mcs.mc6,
        fixtures.mcs.mc7,
        fixtures.mcs.mc8,
        fixtures.mcs.mc9,
      ] as const;
      const showMcSeeds = showSeeds.map((seed, index) => ({
        showKey: seed.key,
        mcUid: mcRotation[index % mcRotation.length],
        uid: `show_mc_seed_${seed.key}`,
      }));

      for (const seed of showMcSeeds) {
        const showId = showByKey.get(seed.showKey);
        const mcId = mcByUid.get(seed.mcUid);
        if (!showId || !mcId) {
          throw new Error(`Missing show/mc for show_mc seed: ${seed.uid}`);
        }

        await tx.showMC.upsert({
          where: {
            showId_mcId: {
              showId,
              mcId,
            },
          },
          update: {
            uid: seed.uid,
            note: 'Seeded assignment',
            metadata: { source: 'seed', seeded: true },
            deletedAt: null,
          },
          create: {
            uid: seed.uid,
            showId,
            mcId,
            note: 'Seeded assignment',
            metadata: { source: 'seed', seeded: true },
          },
        });
      }

      const platformRotation = [
        fixtures.platforms.shopee,
        fixtures.platforms.tiktok,
        fixtures.platforms.lazada,
      ] as const;
      const showPlatformSeeds = showSeeds.map((seed, index) => ({
        showKey: seed.key,
        platformUid: platformRotation[index % platformRotation.length],
        uid: `show_plt_seed_${seed.key}`,
      }));

      for (const seed of showPlatformSeeds) {
        const showId = showByKey.get(seed.showKey);
        const platformId = platformByUid.get(seed.platformUid);
        if (!showId || !platformId) {
          throw new Error(`Missing show/platform for show_platform seed: ${seed.uid}`);
        }

        await tx.showPlatform.upsert({
          where: {
            showId_platformId: {
              showId,
              platformId,
            },
          },
          update: {
            uid: seed.uid,
            liveStreamLink: `https://seed.example.com/${seed.showKey}`,
            platformShowId: `seed_${seed.showKey}`,
            viewerCount: 0,
            metadata: { source: 'seed', seeded: true },
            deletedAt: null,
          },
          create: {
            uid: seed.uid,
            showId,
            platformId,
            liveStreamLink: `https://seed.example.com/${seed.showKey}`,
            platformShowId: `seed_${seed.showKey}`,
            viewerCount: 0,
            metadata: { source: 'seed', seeded: true },
          },
        });
      }

      console.log(`✅ Seeded ${showSeeds.length} shows across ${scheduleSeeds.length} schedules`);

      // Seed TaskTemplate data
      console.log('📝 Seeding TaskTemplate data...');

      const taskTemplateCount = 50;

      for (let i = 1; i <= taskTemplateCount; i++) {
        const uidKey = `template${i}`;
        const uid
          = fixtures.taskTemplates[
            uidKey as keyof typeof fixtures.taskTemplates
          ];
        const name = `Task Template ${i}`;

        // Define a simple schema for the template
        const schema = {
          steps: [
            {
              id: 'step1',
              title: 'Initial Review',
              type: 'checkbox',
              required: true,
            },
            {
              id: 'step2',
              title: 'Asset Collection',
              type: 'upload',
              required: false,
            },
          ],
        };

        const existingTemplate = await tx.taskTemplate.findFirst({
          where: { uid },
        });

        if (!existingTemplate) {
          const template = await tx.taskTemplate.create({
            data: {
              uid,
              studioId: studio.id,
              name,
              description: `Automated task template #${i} for studio workflows`,
              isActive: true,
              currentSchema: schema,
              version: 1,
            },
          });

          // Create initial snapshot
          await tx.taskTemplateSnapshot.create({
            data: {
              templateId: template.id,
              version: 1,
              schema,
              metadata: {
                createdReason: 'Initial seed',
              },
            },
          });

          if (i % 10 === 0)
            console.log(`✅ Created ${i} Task Templates...`);
        } else {
          if (i % 10 === 0)
            console.log(`⏭️  Task Template ${i} already exists...`);
        }
      }
      console.log(`✅ Completed seeding ${taskTemplateCount} Task Templates`);
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
    // close Prisma Client and pool at the end
    await prisma.$disconnect();
    await pool.end();
  });
