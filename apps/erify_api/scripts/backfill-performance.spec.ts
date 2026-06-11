import { runBackfill, POST_PRODUCTION_TEMPLATE_UID } from './backfill-performance';
import { Prisma } from '@prisma/client';

describe('backfill-performance script', () => {
  let mockPrisma: any;
  let mockLogger: jest.Mock;

  beforeEach(() => {
    mockLogger = jest.fn();
    mockPrisma = {
      task: {
        findMany: jest.fn(),
      },
      showPlatform: {
        findFirst: jest.fn(),
        update: jest.fn(),
      },
    };
  });

  it('defaults to completed tasks only so review submissions are not projected', async () => {
    mockPrisma.task.findMany.mockResolvedValue([]);

    await runBackfill({
      prisma: mockPrisma,
      dryRun: true,
      logger: mockLogger,
    });

    expect(mockPrisma.task.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        status: { in: ['COMPLETED'] },
      }),
    }));
  });

  it('applies completedAt date range filters to task query if provided', async () => {
    mockPrisma.task.findMany.mockResolvedValue([]);
    const start = new Date('2026-06-09T00:00:00Z');
    const end = new Date('2026-06-12T00:00:00Z');

    await runBackfill({
      prisma: mockPrisma,
      dryRun: true,
      startDate: start,
      endDate: end,
      logger: mockLogger,
    });

    expect(mockPrisma.task.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        completedAt: {
          gte: start,
          lte: end,
        },
      }),
    }));
  });

  it('runs backfill successfully and updates platforms', async () => {
    // Mock task
    const mockTasks = [
      {
        id: 1n,
        template: { uid: 'ttpl_loop8' },
        completedAt: new Date('2026-06-01T12:00:00Z'),
        snapshot: {
          schema: {
            items: [
              { id: 'fld_gmv', system_fact_key: 'show_platform_gmv' },
              { id: 'fld_views', system_fact_key: 'show_platform_view_count' },
            ],
          },
        },
        content: {
          'fld_gmv:platform:sp_123': '550.50',
          'fld_views:platform:sp_123': 200,
        },
      },
    ];
    mockPrisma.task.findMany.mockResolvedValue(mockTasks);

    // Mock showPlatform find
    mockPrisma.showPlatform.findFirst.mockResolvedValue({
      id: 10n,
      uid: 'sp_123',
      gmv: null,
      viewerCount: 0,
      metadata: {},
    });

    const result = await runBackfill({
      prisma: mockPrisma,
      dryRun: false,
      logger: mockLogger,
    });

    expect(result.processedCount).toBe(2);
    expect(result.updatedCount).toBe(2);
    expect(result.skippedCount).toBe(0);

    expect(mockPrisma.showPlatform.update).toHaveBeenCalledTimes(2);
    expect(mockPrisma.showPlatform.update).toHaveBeenNthCalledWith(1, {
      where: { id: 10n },
      data: {
        gmv: new Prisma.Decimal('550.50'),
        metadata: {
          performance_templates: {
            show_platform_gmv: 'ttpl_loop8',
          },
        },
      },
    });
  });

  it('skips updates when dry-run is true', async () => {
    const mockTasks = [
      {
        id: 1n,
        template: { uid: 'ttpl_loop8' },
        completedAt: new Date('2026-06-01T12:00:00Z'),
        snapshot: {
          schema: {
            items: [{ id: 'fld_gmv', system_fact_key: 'show_platform_gmv' }],
          },
        },
        content: {
          'fld_gmv:platform:sp_123': '550.50',
        },
      },
    ];
    mockPrisma.task.findMany.mockResolvedValue(mockTasks);
    mockPrisma.showPlatform.findFirst.mockResolvedValue({
      id: 10n,
      uid: 'sp_123',
      gmv: null,
      metadata: {},
    });

    const result = await runBackfill({
      prisma: mockPrisma,
      dryRun: true,
      logger: mockLogger,
    });

    expect(result.processedCount).toBe(1);
    expect(result.updatedCount).toBe(1); // Still tracks how many would be written/updated
    expect(mockPrisma.showPlatform.update).not.toHaveBeenCalled();
  });

  it('enforces precedence rules: loop 8 cannot overwrite post-production', async () => {
    const mockTasks = [
      {
        id: 1n,
        template: { uid: 'ttpl_loop8' },
        completedAt: new Date('2026-06-01T12:00:00Z'),
        snapshot: {
          schema: {
            items: [{ id: 'fld_gmv', system_fact_key: 'show_platform_gmv' }],
          },
        },
        content: {
          'fld_gmv:platform:sp_123': '550.50',
        },
      },
    ];
    mockPrisma.task.findMany.mockResolvedValue(mockTasks);
    mockPrisma.showPlatform.findFirst.mockResolvedValue({
      id: 10n,
      uid: 'sp_123',
      gmv: new Prisma.Decimal('1000.00'),
      metadata: {
        performance_templates: {
          show_platform_gmv: POST_PRODUCTION_TEMPLATE_UID,
        },
      },
    });

    const result = await runBackfill({
      prisma: mockPrisma,
      dryRun: false,
      logger: mockLogger,
    });

    expect(result.processedCount).toBe(1);
    expect(result.updatedCount).toBe(0);
    expect(result.skippedCount).toBe(1);
    expect(mockPrisma.showPlatform.update).not.toHaveBeenCalled();
  });

  it('allows post-production to overwrite loop 8 values', async () => {
    const mockTasks = [
      {
        id: 1n,
        template: { uid: POST_PRODUCTION_TEMPLATE_UID },
        completedAt: new Date('2026-06-01T12:00:00Z'),
        snapshot: {
          schema: {
            items: [{ id: 'fld_gmv', system_fact_key: 'show_platform_gmv' }],
          },
        },
        content: {
          'fld_gmv:platform:sp_123': '1000.00',
        },
      },
    ];
    mockPrisma.task.findMany.mockResolvedValue(mockTasks);
    mockPrisma.showPlatform.findFirst.mockResolvedValue({
      id: 10n,
      uid: 'sp_123',
      gmv: new Prisma.Decimal('550.50'),
      metadata: {
        performance_templates: {
          show_platform_gmv: 'ttpl_loop8',
        },
      },
    });

    const result = await runBackfill({
      prisma: mockPrisma,
      dryRun: false,
      logger: mockLogger,
    });

    expect(result.processedCount).toBe(1);
    expect(result.updatedCount).toBe(1);
    expect(result.skippedCount).toBe(0);
    expect(mockPrisma.showPlatform.update).toHaveBeenCalledWith({
      where: { id: 10n },
      data: {
        gmv: new Prisma.Decimal('1000.00'),
        metadata: {
          performance_templates: {
            show_platform_gmv: POST_PRODUCTION_TEMPLATE_UID,
          },
        },
      },
    });
  });
});
