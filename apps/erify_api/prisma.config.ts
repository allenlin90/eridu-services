import 'dotenv/config';

import type { PrismaConfig } from 'prisma';

export default {
  migrations: {
    seed: 'ts-node prisma/seed.ts',
  },
} satisfies PrismaConfig;
