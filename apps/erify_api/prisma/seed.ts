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
    // Check for specific expected records rather than just counts
    const [
      showTypes,
      showStatuses,
      showStandards,
      platforms,
      clients,
      users,
      mcs,
      studios,
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
    const hasAllClients = clients >= 50;
    const hasAllUsers = users >= 31;
    const hasAllMCs = mcs >= 30;
    const hasAllStudios = studios.length === 1;

    const isComplete
      = hasAllShowTypes
      && hasAllShowStatuses
      && hasAllShowStandards
      && hasAllPlatforms
      && hasAllClients
      && hasAllUsers
      && hasAllMCs
      && hasAllStudios
      && hasAllRooms;

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
        `  - Clients: ${clients}/50 (${hasAllClients ? '✅' : '❌'})`,
      );
      console.log(`  - Users: ${users}/31 (${hasAllUsers ? '✅' : '❌'})`);
      console.log(`  - MCs: ${mcs}/30 (${hasAllMCs ? '✅' : '❌'})`);
      console.log(
        `  - Studios: ${studios.length}/1 (${hasAllStudios ? '✅' : '❌'})`,
      );
      console.log(`  - Studio Rooms: ${hasAllRooms ? '10/10 ✅' : '❌'}`);
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
          metadata: { description: 'Show was cancelled', order: 5 },
        },
      ];

      for (const showStatus of showStatuses) {
        const uidKey = showStatus.name as keyof typeof fixtures.showStatuses;
        await tx.showStatus.upsert({
          where: { name: showStatus.name },
          update: {},
          create: {
            uid: fixtures.showStatuses[uidKey],
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
        update: {},
        create: {
          uid: fixtures.users.admin,
          email: 'admin@example.com',
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
        const mcUser = await tx.user.upsert({
          where: { email: `mcuser${i}@example.com` },
          update: {},
          create: {
            uid: fixtures.users[uidKey],
            email: `mcuser${i}@example.com`,
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

      // Seed StudioMembership data
      console.log('👥 Seeding StudioMembership data...');
      const existingMembership = await tx.studioMembership.findFirst({
        where: {
          userId: adminUser.id, // Admin User
          studioId: studio.id,
        },
      });

      if (!existingMembership) {
        await tx.studioMembership.create({
          data: {
            uid: fixtures.studioMemberships.adminMainStudio,
            userId: adminUser.id, // Admin User has studio membership
            studioId: studio.id,
            role: 'admin',
            metadata: {
              joinedDate: new Date().toISOString(),
              permissions: ['manage_studio', 'manage_rooms', 'view_reports'],
            },
          },
        });
        console.log(
          `✅ Created StudioMembership: ${adminUser.name} -> ${studio.name} (admin)`,
        );
      } else {
        console.log(
          `⏭️  StudioMembership already exists: ${adminUser.name} -> ${studio.name}`,
        );
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
    // close Prisma Client and pool at the end
    await prisma.$disconnect();
    await pool.end();
  });
