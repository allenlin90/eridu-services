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

    const sql = executeRaw.mock.calls[0][0].strings.join('');
    // Regression guard: the raw UPDATE is hand-written SQL with no compile-time
    // column checking, so pin the table + identity/scope predicate literals.
    // A typo in any of these (a Prisma model rename that desyncs the @@map, a
    // fat-fingered column) must fail this test loudly rather than at runtime.
    expect(sql).toContain('UPDATE "show_platforms"');
    expect(sql).toContain('\'{performance_templates}\'');
    expect(sql).toContain('"uid"');
    expect(sql).toContain('"show_id"');
    expect(sql).toContain('"deleted_at" IS NULL');
  });

  it('interpolates the metric column as a quoted identifier (per closed union)', async () => {
    executeRaw.mockResolvedValue(1);

    await repository.updatePerformanceMetric({
      uid: 'show_plt_123',
      showId: 10n,
      column: 'viewer_count',
      value: 4200,
      factKey: 'show_platform_viewer_count',
      templateUid: 'ttpl_loop',
      protectedTemplateUid: 'ttpl_post_production',
    });

    // Prisma.raw splices the column name into the static SQL text, so the
    // joined template strings must carry the quoted identifier verbatim.
    const sql = executeRaw.mock.calls[0][0].strings.join('');
    expect(sql).toContain('"viewer_count"');
  });

  it('writes manager corrections with scoped predicates and JSONB provenance merges', async () => {
    executeRaw.mockResolvedValue(1);

    const result = await repository.updateCorrectedPerformanceMetrics({
      uid: 'show_plt_123',
      showId: 10n,
      metrics: [
        { column: 'gmv', value: 1250 },
        { column: 'viewer_count', value: 4200 },
      ],
      actualsSources: {
        show_platform_gmv: 'MANAGER',
        show_platform_view_count: 'MANAGER',
      },
      performanceTemplates: {
        show_platform_gmv: 'MANAGER',
        show_platform_view_count: 'MANAGER',
      },
    });

    expect(result).toBe('updated');
    const sql = executeRaw.mock.calls[0][0].strings.join('');
    expect(sql).toContain('UPDATE "show_platforms"');
    expect(sql).toContain('"gmv"');
    expect(sql).toContain('"viewer_count"');
    expect(sql).toContain('\'{actuals_source}\'');
    expect(sql).toContain('\'{performance_templates}\'');
    expect(sql).toContain('"uid"');
    expect(sql).toContain('"show_id"');
    expect(sql).toContain('"deleted_at" IS NULL');
  });

  it('returns not_found when a manager correction hits no active scoped row', async () => {
    executeRaw.mockResolvedValue(0);

    const result = await repository.updateCorrectedPerformanceMetrics({
      uid: 'show_plt_123',
      showId: 10n,
      metrics: [{ column: 'gmv', value: 1250 }],
      actualsSources: { show_platform_gmv: 'MANAGER' },
      performanceTemplates: { show_platform_gmv: 'MANAGER' },
    });

    expect(result).toBe('not_found');
  });
});
