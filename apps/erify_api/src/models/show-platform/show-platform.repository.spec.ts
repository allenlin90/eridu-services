import type { TransactionHost } from '@nestjs-cls/transactional';

import { ShowPlatformRepository } from './show-platform.repository';

import type { PrismaService } from '@/prisma/prisma.service';

function createShowPlatformDelegateMock() {
  return {
    create: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    findMany: jest.fn(),
  };
}

describe('showPlatformRepository', () => {
  let repository: ShowPlatformRepository;
  const prismaShowPlatformDelegate = createShowPlatformDelegateMock();
  const txShowPlatformDelegate = createShowPlatformDelegateMock();
  const executeRaw = jest.fn();
  const queryRaw = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    const prisma = {
      showPlatform: prismaShowPlatformDelegate,
    } as unknown as PrismaService;

    const txHost = {
      tx: {
        showPlatform: txShowPlatformDelegate,
        $executeRaw: executeRaw,
        $queryRaw: queryRaw,
      },
    } as unknown as TransactionHost<any>;

    repository = new ShowPlatformRepository(prisma, txHost);
  });

  it('writes performance metrics against the mapped show_platforms table', async () => {
    executeRaw.mockResolvedValue(1);

    await repository.updatePerformanceMetric({
      uid: 'show_plt_123',
      showId: 10n,
      column: 'gmv',
      value: 1250,
      factKey: 'show_platform_gmv',
      templateUid: 'ttpl_post_production',
      protectedTemplateUid: 'ttpl_post_production',
    });

    const sql = executeRaw.mock.calls[0][0];
    expect(sql.strings.join('')).toContain('UPDATE "show_platforms"');
  });
});
