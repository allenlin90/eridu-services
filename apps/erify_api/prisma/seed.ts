import 'dotenv/config';

import { PrismaPg } from '@prisma/adapter-pg';
import type { Prisma, Studio, User } from '@prisma/client';
import { PrismaClient, TaskStatus, TaskType } from '@prisma/client';
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

const TASK_TEMPLATE_COUNT = 50;
const REPORT_SEED_SHOW_COUNT = 4;
const REPORT_SEED_TASK_COUNT = 12;
const REPORT_SEED_SHOW_EXTERNAL_ID_PREFIX = 'seed-report-';
const REPORT_SEED_TASK_UID_PREFIX = 'task_seed_report_';
const TASK_TYPE_SEQUENCE: TaskType[] = [
  TaskType.SETUP,
  TaskType.ACTIVE,
  TaskType.CLOSURE,
  TaskType.ADMIN,
  TaskType.ROUTINE,
];

const SUBMITTED_TASK_STATUSES: TaskStatus[] = [
  TaskStatus.REVIEW,
  TaskStatus.COMPLETED,
  TaskStatus.CLOSED,
];

type SeedSharedField = {
  key: string;
  type: 'number' | 'url';
  category: 'metric' | 'evidence' | 'status';
  label: string;
  description: string;
  is_active: boolean;
};

const SHARED_FIELD_SEEDS: SeedSharedField[] = [
  {
    key: 'gmv',
    type: 'number',
    category: 'metric',
    label: 'GMV',
    description: 'Gross merchandise value for this task entry',
    is_active: true,
  },
  {
    key: 'orders',
    type: 'number',
    category: 'metric',
    label: 'Orders',
    description: 'Order count captured for this task entry',
    is_active: true,
  },
  {
    key: 'proof_link',
    type: 'url',
    category: 'evidence',
    label: 'Proof Link',
    description: 'Reference link used as evidence for this task entry',
    is_active: true,
  },
];

function deterministicUid(prefix: string, index: number): string {
  return `${prefix}${String(index).padStart(6, '0')}`;
}

function toObjectRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  return value as Record<string, unknown>;
}

function mergeSeedSharedFields(metadata: unknown): Record<string, unknown> {
  const metadataObject = toObjectRecord(metadata);
  const existingSharedFieldsRaw = metadataObject.shared_fields;
  const existingSharedFields = Array.isArray(existingSharedFieldsRaw)
    ? existingSharedFieldsRaw
    : [];

  const sharedFieldByKey = new Map<string, Record<string, unknown>>();

  for (const field of existingSharedFields) {
    if (!field || typeof field !== 'object' || Array.isArray(field)) {
      continue;
    }

    const fieldObj = field as Record<string, unknown>;
    if (typeof fieldObj.key !== 'string' || fieldObj.key.length === 0) {
      continue;
    }

    sharedFieldByKey.set(fieldObj.key, fieldObj);
  }

  for (const seedField of SHARED_FIELD_SEEDS) {
    if (sharedFieldByKey.has(seedField.key)) {
      continue;
    }

    sharedFieldByKey.set(seedField.key, seedField as unknown as Record<string, unknown>);
  }

  return {
    ...metadataObject,
    shared_fields: Array.from(sharedFieldByKey.values()).sort((a, b) => (
      String(a.key).localeCompare(String(b.key))
    )),
  };
}

function buildTemplateSchema(templateIndex: number) {
  const taskType = TASK_TYPE_SEQUENCE[(templateIndex - 1) % TASK_TYPE_SEQUENCE.length];
  const baseItems = [
    {
      id: `field_${templateIndex}_gmv`,
      key: 'gmv',
      type: 'number',
      standard: true,
      label: 'GMV',
      description: 'Sales value captured for this show loop',
      required: true,
    },
    {
      id: `field_${templateIndex}_orders`,
      key: 'orders',
      type: 'number',
      standard: true,
      label: 'Orders',
      description: 'Order count captured for this show loop',
      required: true,
    },
    {
      id: `field_${templateIndex}_proof_link`,
      key: 'proof_link',
      type: 'url',
      standard: true,
      label: 'Proof Link',
      description: 'URL for screenshot/video evidence',
      required: false,
    },
  ] as const;

  const taskTypeItems = (() => {
    switch (taskType) {
      case TaskType.SETUP:
        return [
          {
            id: `field_${templateIndex}_setup_note`,
            key: 'setup_note',
            type: 'textarea',
            label: 'Setup Note',
            description: 'Checklist note before show starts',
            required: false,
          },
        ];
      case TaskType.ACTIVE:
        return [
          {
            id: `field_${templateIndex}_peak_viewers`,
            key: 'peak_viewers',
            type: 'number',
            label: 'Peak Viewers',
            description: 'Highest concurrent viewers observed during live show',
            required: false,
          },
        ];
      case TaskType.CLOSURE:
        return [
          {
            id: `field_${templateIndex}_closure_summary`,
            key: 'closure_summary',
            type: 'textarea',
            label: 'Closure Summary',
            description: 'Short summary after show ends',
            required: false,
          },
          {
            id: `field_${templateIndex}_follow_up_required`,
            key: 'follow_up_required',
            type: 'checkbox',
            label: 'Follow Up Required',
            description: 'Mark if this show needs follow-up action',
            required: false,
          },
        ];
      case TaskType.ADMIN:
        return [
          {
            id: `field_${templateIndex}_admin_note`,
            key: 'admin_note',
            type: 'text',
            label: 'Admin Note',
            description: 'Internal administrative note',
            required: false,
          },
        ];
      case TaskType.ROUTINE:
        return [
          {
            id: `field_${templateIndex}_routine_observation`,
            key: 'routine_observation',
            type: 'text',
            label: 'Routine Observation',
            description: 'Quick observation for routine check',
            required: false,
          },
        ];
      default:
        return [
          {
            id: `field_${templateIndex}_general_note`,
            key: 'general_note',
            type: 'text',
            label: 'General Note',
            description: 'General note for this task',
            required: false,
          },
        ];
    }
  })();

  return {
    items: [...baseItems, ...taskTypeItems],
    metadata: {
      task_type: taskType,
    },
  };
}

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
      canonicalCreatorUids,
      studios,
      studioMembershipCount,
      studioShiftCount,
      studioShiftBlockCount,
      taskTemplateCount,
      baselineTemplate,
      reportSeedShowCount,
      reportSeedSubmittedTaskCount,
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
      prisma.creator.count(),
      prisma.creator.count({
        where: {
          uid: { startsWith: 'creator_' },
          deletedAt: null,
        },
      }),
      prisma.studio.findMany({
        where: {
          name: {
            in: ['Main Studio'],
          },
        },
      }),
      prisma.studioMembership.count(),
      prisma.studioShift.count(),
      prisma.studioShiftBlock.count(),
      prisma.taskTemplate.count(),
      prisma.taskTemplate.findUnique({
        where: { uid: fixtures.taskTemplates.template1 },
        select: { currentSchema: true },
      }),
      prisma.show.count({
        where: {
          deletedAt: null,
          studio: { uid: fixtures.studios.mainStudio },
          externalId: { startsWith: REPORT_SEED_SHOW_EXTERNAL_ID_PREFIX },
        },
      }),
      prisma.task.count({
        where: {
          deletedAt: null,
          uid: { startsWith: REPORT_SEED_TASK_UID_PREFIX },
          status: { in: SUBMITTED_TASK_STATUSES },
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
    const hasAllUsers = users >= 35;
    const hasAllMCs = mcs >= 30;
    const hasCanonicalCreatorUids = canonicalCreatorUids >= 30;
    const hasAllStudios = studios.length === 1;
    const hasStudioMemberships = studioMembershipCount >= 7;
    const hasStudioShifts = studioShiftCount >= 2;
    const hasStudioShiftBlocks = studioShiftBlockCount >= 3;

    const hasAllTaskTemplates = taskTemplateCount >= TASK_TEMPLATE_COUNT;
    const baselineSchemaRecord = toObjectRecord(baselineTemplate?.currentSchema);
    const baselineSchemaItems = baselineSchemaRecord.items;
    const baselineMetadata = toObjectRecord(baselineSchemaRecord.metadata);
    const hasModernTemplateSchema = Array.isArray(baselineSchemaItems)
      && baselineSchemaItems.length > 0
      && typeof baselineMetadata.task_type === 'string';
    const hasReportSeedShows = reportSeedShowCount >= REPORT_SEED_SHOW_COUNT;
    const hasReportSeedSubmittedTasks = reportSeedSubmittedTaskCount >= REPORT_SEED_TASK_COUNT;

    const isComplete
      = hasAllShowTypes
      && hasAllShowStatuses
      && hasAllShowStandards
      && hasAllPlatforms
      && hasAllClients
      && hasAllUsers
      && hasAllMCs
      && hasCanonicalCreatorUids
      && hasAllStudios
      && hasStudioMemberships
      && hasStudioShifts
      && hasStudioShiftBlocks
      && hasAllRooms
      && hasAllTaskTemplates
      && hasModernTemplateSchema
      && hasReportSeedShows
      && hasReportSeedSubmittedTasks;

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
      console.log(`  - Users: ${users}/35 (${hasAllUsers ? '✅' : '❌'})`);
      console.log(`  - MCs: ${mcs}/30 (${hasAllMCs ? '✅' : '❌'})`);
      console.log(
        `  - Canonical creator UIDs: ${canonicalCreatorUids}/30 (${hasCanonicalCreatorUids ? '✅' : '❌'})`,
      );
      console.log(
        `  - Studios: ${studios.length}/1 (${hasAllStudios ? '✅' : '❌'})`,
      );
      console.log(
        `  - StudioMemberships: ${studioMembershipCount}/7 (${hasStudioMemberships ? '✅' : '❌'})`,
      );
      console.log(
        `  - StudioShifts: ${studioShiftCount}/2 (${hasStudioShifts ? '✅' : '❌'})`,
      );
      console.log(
        `  - StudioShiftBlocks: ${studioShiftBlockCount}/3 (${hasStudioShiftBlocks ? '✅' : '❌'})`,
      );
      console.log(`  - Studio Rooms: ${hasAllRooms ? '10/10 ✅' : '❌'}`);
      console.log(
        `  - TaskTemplates: ${taskTemplateCount}/${TASK_TEMPLATE_COUNT} (${hasAllTaskTemplates ? '✅' : '❌'})`,
      );
      console.log(
        `  - Baseline Template Schema: ${hasModernTemplateSchema ? '✅' : '❌'} (expects items[] + metadata.task_type)`,
      );
      console.log(
        `  - Report Seed Shows: ${reportSeedShowCount}/${REPORT_SEED_SHOW_COUNT} (${hasReportSeedShows ? '✅' : '❌'})`,
      );
      console.log(
        `  - Report Seed Submitted Tasks: ${reportSeedSubmittedTaskCount}/${REPORT_SEED_TASK_COUNT} (${hasReportSeedSubmittedTasks ? '✅' : '❌'})`,
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
          systemKey: 'DRAFT',
          metadata: {
            description: 'Show is in draft state, not yet confirmed',
            order: 1,
          },
        },
        {
          name: 'confirmed',
          systemKey: 'CONFIRMED',
          metadata: {
            description: 'Show is confirmed and ready to go live',
            order: 2,
          },
        },
        {
          name: 'live',
          systemKey: 'LIVE',
          metadata: {
            description: 'Show is currently live/streaming',
            order: 3,
          },
        },
        {
          name: 'completed',
          systemKey: 'COMPLETED',
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
          update: {
            systemKey: showStatus.systemKey,
            metadata: showStatus.metadata,
          },
          create: {
            uid: fixtures.showStatuses[uidKey],
            systemKey: showStatus.systemKey,
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

      const testAdminUser = await tx.user.upsert({
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

      const testUser = await tx.user.upsert({
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

      const testUser2 = await tx.user.upsert({
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

      const testUser3 = await tx.user.upsert({
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

      // 30 Creator users
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
            name: `Creator User ${i}`,
            metadata: {
              role: 'Creator',
              department: 'Entertainment',
              specialization,
              experience,
            },
          },
        });
        createdUsers.push(mcUser);
        if (i % 10 === 0) {
          console.log(`✅ Created/updated ${i} Creator users...`);
        }
      }
      console.log(
        `✅ Completed seeding ${createdUsers.length + 4} users (1 admin + 30 Creator users + 4 role-test users)`,
      );

      // Seed Creator data
      console.log('🎤 Seeding Creator data...');
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

      // Create 30 MCs, each linked to one of the 30 Creator users (skip admin user at index 0)
      for (let i = 1; i <= 30; i++) {
        const specialization
          = mcSpecializations[(i - 1) % mcSpecializations.length];
        const experience = `${Math.floor(Math.random() * 10) + 1} years`;
        const mcName = `Creator ${i}`;
        const aliasName = `Creator${i}`;
        const mcUser = createdUsers[i]; // Skip admin at index 0
        const uidKey = `mc${i}` as keyof typeof fixtures.mcs;

        const creatorUid = fixtures.mcs[uidKey];
        const existingMcByUid = await tx.creator.findUnique({
          where: { uid: creatorUid },
          select: { id: true },
        });
        const existingMcByName = existingMcByUid
          ? null
          : await tx.creator.findFirst({
              where: { name: mcName },
              select: { id: true },
            });
        const existingMcId = existingMcByUid?.id ?? existingMcByName?.id;

        if (!existingMcId) {
          await tx.creator.create({
            data: {
              uid: creatorUid,
              name: mcName,
              aliasName,
              userId: mcUser.id,
              metadata: {
                specialization,
                experience,
              },
            },
          });
        } else {
          await tx.creator.update({
            where: { id: existingMcId },
            data: {
              uid: creatorUid,
              name: mcName,
              aliasName,
              userId: mcUser.id,
              metadata: {
                specialization,
                experience,
              },
            },
          });
        }

        if (i % 10 === 0) {
          console.log(`✅ Created/updated ${i} MCs...`);
        }
      }
      console.log(`✅ Completed seeding 30 MCs (canonical creator UIDs, all linked to Creator users)`);

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
            metadata: mergeSeedSharedFields({
              description: 'Main production studio facility',
              location: 'Downtown',
            }) as Prisma.InputJsonValue,
          },
        });
        console.log(`✅ Created Studio: ${studio.name}`);
      } else {
        studio = await tx.studio.update({
          where: { id: existingStudio.id },
          data: {
            metadata: mergeSeedSharedFields(existingStudio.metadata) as Prisma.InputJsonValue,
          },
        });
        console.log(`♻️  Updated Studio metadata (shared fields): ${studio.name}`);
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
      const mcUser1 = createdUsers[1];
      const mcUser2 = createdUsers[2];

      const membershipSeeds = [
        {
          uid: fixtures.studioMemberships.adminMainStudio,
          userId: adminUser.id,
          role: 'admin',
          baseHourlyRate: '40.00',
          metadata: {
            joinedDate: new Date().toISOString(),
            permissions: ['manage_studio', 'manage_rooms', 'view_reports'],
          },
          label: `${adminUser.name} -> ${studio.name} (admin)`,
        },
        {
          uid: fixtures.studioMemberships.mc1MainStudio,
          userId: mcUser1.id,
          role: 'manager',
          baseHourlyRate: '25.00',
          metadata: {
            joinedDate: new Date().toISOString(),
            permissions: ['view_schedule', 'manage_tasks'],
          },
          label: `${mcUser1.name} -> ${studio.name} (manager)`,
        },
        {
          uid: fixtures.studioMemberships.mc2MainStudio,
          userId: mcUser2.id,
          role: 'member',
          baseHourlyRate: '18.50',
          metadata: {
            joinedDate: new Date().toISOString(),
            permissions: ['view_schedule'],
          },
          label: `${mcUser2.name} -> ${studio.name} (member)`,
        },
        {
          uid: fixtures.studioMemberships.testAdminMainStudio,
          userId: testAdminUser.id,
          role: 'admin',
          baseHourlyRate: '35.00',
          metadata: {
            joinedDate: new Date().toISOString(),
            permissions: ['manage_studio', 'manage_rooms', 'manage_members'],
            source: 'seed-role-testing',
          },
          label: `${testAdminUser.name} -> ${studio.name} (admin)`,
        },
        {
          uid: fixtures.studioMemberships.testUserMainStudio,
          userId: testUser.id,
          role: 'manager',
          baseHourlyRate: '22.00',
          metadata: {
            joinedDate: new Date().toISOString(),
            permissions: ['view_schedule', 'manage_tasks'],
            source: 'seed-role-testing',
          },
          label: `${testUser.name} -> ${studio.name} (manager)`,
        },
        {
          uid: fixtures.studioMemberships.testUser2MainStudio,
          userId: testUser2.id,
          role: 'member',
          baseHourlyRate: '18.00',
          metadata: {
            joinedDate: new Date().toISOString(),
            permissions: ['view_schedule'],
            source: 'seed-role-testing',
          },
          label: `${testUser2.name} -> ${studio.name} (member)`,
        },
        {
          uid: fixtures.studioMemberships.testUser3MainStudio,
          userId: testUser3.id,
          role: 'member',
          baseHourlyRate: '18.00',
          metadata: {
            joinedDate: new Date().toISOString(),
            permissions: ['view_schedule'],
            source: 'seed-role-testing',
          },
          label: `${testUser3.name} -> ${studio.name} (member)`,
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

      // Seed TaskTemplate data
      console.log('📝 Seeding TaskTemplate data...');

      for (let i = 1; i <= TASK_TEMPLATE_COUNT; i++) {
        const uidKey = `template${i}`;
        const uid
          = fixtures.taskTemplates[
            uidKey as keyof typeof fixtures.taskTemplates
          ];
        const name = `Task Template ${i}`;
        const description = `Seeded task template #${i} for local report and workflow testing`;
        const schema = buildTemplateSchema(i);

        const existingTemplate = await tx.taskTemplate.findUnique({
          where: { uid },
          select: {
            id: true,
            version: true,
            currentSchema: true,
          },
        });

        if (!existingTemplate) {
          const template = await tx.taskTemplate.create({
            data: {
              uid,
              studioId: studio.id,
              name,
              description,
              isActive: true,
              currentSchema: schema as Prisma.InputJsonValue,
              version: 1,
            },
          });

          await tx.taskTemplateSnapshot.create({
            data: {
              templateId: template.id,
              version: 1,
              schema: schema as Prisma.InputJsonValue,
              metadata: {
                createdReason: 'Initial seed',
                source: 'seed',
              },
            },
          });
        } else {
          const currentSchemaRecord = toObjectRecord(existingTemplate.currentSchema);
          const currentItems = currentSchemaRecord.items;
          const currentMetadata = toObjectRecord(currentSchemaRecord.metadata);
          const needsSchemaMigration = !Array.isArray(currentItems)
            || currentItems.length === 0
            || typeof currentMetadata.task_type !== 'string';

          const effectiveSchema: Prisma.InputJsonValue = (
            needsSchemaMigration
              ? schema
              : (existingTemplate.currentSchema ?? {})
          ) as Prisma.InputJsonValue;

          if (needsSchemaMigration) {
            await tx.taskTemplate.update({
              where: { id: existingTemplate.id },
              data: {
                studioId: studio.id,
                name,
                description,
                isActive: true,
                currentSchema: schema as Prisma.InputJsonValue,
                version: Math.max(existingTemplate.version, 1),
              },
            });
          }

          await tx.taskTemplateSnapshot.upsert({
            where: {
              templateId_version: {
                templateId: existingTemplate.id,
                version: 1,
              },
            },
            update: needsSchemaMigration
              ? {
                  schema: effectiveSchema,
                  metadata: {
                    createdReason: 'Seed baseline refresh',
                    source: 'seed',
                  },
                }
              : {},
            create: {
              templateId: existingTemplate.id,
              version: 1,
              schema: effectiveSchema,
              metadata: {
                createdReason: 'Initial seed',
                source: 'seed',
              },
            },
          });
        }

        if (i % 10 === 0) {
          console.log(`✅ Processed ${i} Task Templates...`);
        }
      }
      console.log(`✅ Completed seeding ${TASK_TEMPLATE_COUNT} Task Templates`);

      // Seed report-ready shows + submitted tasks for local Task Reports UX validation.
      console.log('📊 Seeding report-ready shows and submitted tasks...');

      const [
        nikeClient,
        adidasClient,
        bauType,
        campaignType,
        completedStatus,
        confirmedStatus,
        standardTier,
        premiumTier,
        roomA,
        roomB,
      ] = await Promise.all([
        tx.client.findUnique({ where: { uid: fixtures.clients.nike }, select: { id: true } }),
        tx.client.findUnique({ where: { uid: fixtures.clients.adidas }, select: { id: true } }),
        tx.showType.findUnique({ where: { uid: fixtures.showTypes.bau }, select: { id: true } }),
        tx.showType.findUnique({ where: { uid: fixtures.showTypes.campaign }, select: { id: true } }),
        tx.showStatus.findUnique({ where: { uid: fixtures.showStatuses.completed }, select: { id: true } }),
        tx.showStatus.findUnique({ where: { uid: fixtures.showStatuses.confirmed }, select: { id: true } }),
        tx.showStandard.findUnique({ where: { uid: fixtures.showStandards.standard }, select: { id: true } }),
        tx.showStandard.findUnique({ where: { uid: fixtures.showStandards.premium }, select: { id: true } }),
        tx.studioRoom.findUnique({ where: { uid: fixtures.studioRooms.roomA }, select: { id: true } }),
        tx.studioRoom.findUnique({ where: { uid: fixtures.studioRooms.roomB }, select: { id: true } }),
      ]);

      if (
        !nikeClient
        || !adidasClient
        || !bauType
        || !campaignType
        || !completedStatus
        || !confirmedStatus
        || !standardTier
        || !premiumTier
        || !roomA
        || !roomB
      ) {
        throw new Error('Missing required reference data for report seed dataset');
      }

      const reportDayBase = new Date(Date.UTC(
        today.getUTCFullYear(),
        today.getUTCMonth(),
        today.getUTCDate(),
      ));
      const createWindow = (dayOffset: number, startHourUtc: number, durationHours: number) => {
        const startTime = new Date(reportDayBase);
        startTime.setUTCDate(startTime.getUTCDate() + dayOffset);
        startTime.setUTCHours(startHourUtc, 0, 0, 0);
        const endTime = new Date(startTime);
        endTime.setUTCHours(endTime.getUTCHours() + durationHours);
        return { startTime, endTime };
      };

      const reportShowSeeds = [
        {
          uid: deterministicUid('show_seed_report_', 1),
          externalId: `${REPORT_SEED_SHOW_EXTERNAL_ID_PREFIX}001`,
          name: 'Report Seed Show 001',
          ...createWindow(-3, 10, 2),
          clientId: nikeClient.id,
          showTypeId: bauType.id,
          showStatusId: completedStatus.id,
          showStandardId: standardTier.id,
          studioRoomId: roomA.id,
        },
        {
          uid: deterministicUid('show_seed_report_', 2),
          externalId: `${REPORT_SEED_SHOW_EXTERNAL_ID_PREFIX}002`,
          name: 'Report Seed Show 002',
          ...createWindow(-2, 14, 2),
          clientId: nikeClient.id,
          showTypeId: campaignType.id,
          showStatusId: completedStatus.id,
          showStandardId: premiumTier.id,
          studioRoomId: roomB.id,
        },
        {
          uid: deterministicUid('show_seed_report_', 3),
          externalId: `${REPORT_SEED_SHOW_EXTERNAL_ID_PREFIX}003`,
          name: 'Report Seed Show 003',
          ...createWindow(-1, 11, 2),
          clientId: adidasClient.id,
          showTypeId: bauType.id,
          showStatusId: confirmedStatus.id,
          showStandardId: standardTier.id,
          studioRoomId: roomA.id,
        },
        {
          uid: deterministicUid('show_seed_report_', 4),
          externalId: `${REPORT_SEED_SHOW_EXTERNAL_ID_PREFIX}004`,
          name: 'Report Seed Show 004',
          ...createWindow(0, 15, 2),
          clientId: adidasClient.id,
          showTypeId: campaignType.id,
          showStatusId: confirmedStatus.id,
          showStandardId: premiumTier.id,
          studioRoomId: roomB.id,
        },
      ] as const;

      const seededShows = new Map<string, {
        id: bigint;
        uid: string;
        name: string;
        startTime: Date;
        endTime: Date;
      }>();
      for (const showSeed of reportShowSeeds) {
        const show = await tx.show.upsert({
          where: {
            clientId_externalId: {
              clientId: showSeed.clientId,
              externalId: showSeed.externalId,
            },
          },
          update: {
            uid: showSeed.uid,
            name: showSeed.name,
            startTime: showSeed.startTime,
            endTime: showSeed.endTime,
            studioId: studio.id,
            studioRoomId: showSeed.studioRoomId,
            showTypeId: showSeed.showTypeId,
            showStatusId: showSeed.showStatusId,
            showStandardId: showSeed.showStandardId,
            scheduleId: null,
            metadata: {
              source: 'seed-report-dataset',
            },
            deletedAt: null,
          },
          create: {
            uid: showSeed.uid,
            externalId: showSeed.externalId,
            name: showSeed.name,
            startTime: showSeed.startTime,
            endTime: showSeed.endTime,
            studioId: studio.id,
            studioRoomId: showSeed.studioRoomId,
            showTypeId: showSeed.showTypeId,
            showStatusId: showSeed.showStatusId,
            showStandardId: showSeed.showStandardId,
            clientId: showSeed.clientId,
            metadata: {
              source: 'seed-report-dataset',
            },
          },
          select: {
            id: true,
            uid: true,
            name: true,
            startTime: true,
            endTime: true,
          },
        });

        seededShows.set(showSeed.externalId, show);
      }

      const reportTemplateUids = [
        fixtures.taskTemplates.template1,
        fixtures.taskTemplates.template2,
        fixtures.taskTemplates.template3,
      ];
      const reportTemplates = await tx.taskTemplate.findMany({
        where: {
          studioId: studio.id,
          uid: { in: reportTemplateUids },
          deletedAt: null,
        },
        select: {
          id: true,
          uid: true,
          name: true,
          currentSchema: true,
          snapshots: {
            orderBy: { version: 'desc' },
            take: 1,
            select: {
              id: true,
              version: true,
              schema: true,
            },
          },
        },
      });

      if (reportTemplates.length !== reportTemplateUids.length) {
        throw new Error('Missing baseline task templates for report seed dataset');
      }

      const reportTemplateByUid = new Map(reportTemplates.map((template) => [template.uid, template]));

      const reportTaskContent = (
        showIndex: number,
        templateUid: string,
        showExternalId: string,
      ): Prisma.JsonObject => {
        const templateNumber = Number(templateUid.split('_').pop() || '0');
        const gmv = 1000 + showIndex * 180 + templateNumber * 35;
        const orders = 18 + showIndex * 4 + templateNumber;
        const sharedContent: Prisma.JsonObject = {
          gmv,
          orders,
          proof_link: `https://example.local/reports/${showExternalId}/${templateUid}`,
        };

        if (templateUid === fixtures.taskTemplates.template1) {
          return {
            ...sharedContent,
            setup_note: `Setup checklist completed for ${showExternalId}`,
          };
        }

        if (templateUid === fixtures.taskTemplates.template2) {
          return {
            ...sharedContent,
            peak_viewers: 120 + showIndex * 25,
          };
        }

        return {
          ...sharedContent,
          closure_summary: `Post-show summary for ${showExternalId}`,
          follow_up_required: showIndex % 2 === 0,
        };
      };

      let reportTaskIndex = 1;
      const orderedShowSeeds = [...reportShowSeeds].sort((a, b) => a.externalId.localeCompare(b.externalId));
      for (const [showIndex, showSeed] of orderedShowSeeds.entries()) {
        const show = seededShows.get(showSeed.externalId);
        if (!show) {
          throw new Error(`Seed show not found after upsert: ${showSeed.externalId}`);
        }

        for (const [templateIndex, templateUid] of reportTemplateUids.entries()) {
          const template = reportTemplateByUid.get(templateUid);
          const snapshot = template?.snapshots?.[0];
          if (!template || !snapshot) {
            throw new Error(`Seed template snapshot not found: ${templateUid}`);
          }

          const templateSchema = toObjectRecord(template.currentSchema);
          const templateMetadata = toObjectRecord(templateSchema.metadata);
          const taskTypeValue = templateMetadata.task_type;
          const taskType = Object.values(TaskType).includes(taskTypeValue as TaskType)
            ? taskTypeValue as TaskType
            : TaskType.OTHER;
          const status = SUBMITTED_TASK_STATUSES[(showIndex + templateIndex) % SUBMITTED_TASK_STATUSES.length];
          const taskUid = deterministicUid(REPORT_SEED_TASK_UID_PREFIX, reportTaskIndex);
          reportTaskIndex++;

          const task = await tx.task.upsert({
            where: { uid: taskUid },
            update: {
              description: `${template.name} - ${show.name}`,
              status,
              type: taskType,
              dueDate: show.endTime,
              snapshotId: snapshot.id,
              templateId: template.id,
              content: reportTaskContent(showIndex, templateUid, showSeed.externalId),
              metadata: {
                source: 'seed-report-dataset',
                show_external_id: showSeed.externalId,
              },
              studioId: studio.id,
              assigneeId: showIndex % 2 === 0 ? mcUser1.id : mcUser2.id,
              deletedAt: null,
            },
            create: {
              uid: taskUid,
              description: `${template.name} - ${show.name}`,
              status,
              type: taskType,
              dueDate: show.endTime,
              snapshotId: snapshot.id,
              templateId: template.id,
              content: reportTaskContent(showIndex, templateUid, showSeed.externalId),
              metadata: {
                source: 'seed-report-dataset',
                show_external_id: showSeed.externalId,
              },
              version: 1,
              studioId: studio.id,
              assigneeId: showIndex % 2 === 0 ? mcUser1.id : mcUser2.id,
            },
            select: {
              id: true,
            },
          });

          await tx.taskTarget.upsert({
            where: {
              taskId_targetType_targetId: {
                taskId: task.id,
                targetType: 'SHOW',
                targetId: show.id,
              },
            },
            update: {
              showId: show.id,
              studioId: studio.id,
              deletedAt: null,
            },
            create: {
              taskId: task.id,
              targetType: 'SHOW',
              targetId: show.id,
              showId: show.id,
              studioId: studio.id,
            },
          });
        }
      }
      console.log(`✅ Seeded ${REPORT_SEED_SHOW_COUNT} report shows and ${REPORT_SEED_TASK_COUNT} submitted tasks`);
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
