import { ShowPlatformActualEndTimeExtractor } from './show-platform-actual-end-time.extractor';

import type { ShowPlatformService } from '@/models/show-platform/show-platform.service';

function buildShowPlatformService(overrides: {
  metadata?: Record<string, unknown>;
  actualStartTime?: Date | null;
  actualEndTime?: Date | null;
  showId?: bigint;
  notFound?: boolean;
}): jest.Mocked<ShowPlatformService> {
  const service: any = {
    getShowPlatformById: jest.fn().mockResolvedValue(
      overrides.notFound
        ? null
        : {
            id: 200n,
            uid: 'show_plt_200',
            showId: overrides.showId ?? 10n,
            metadata: overrides.metadata ?? {},
            actualStartTime: overrides.actualStartTime ?? null,
            actualEndTime: overrides.actualEndTime ?? null,
          },
    ),
    updateActuals: jest.fn().mockResolvedValue({} as never),
    ensureValidActualTimeRange: jest.fn(),
  };

  if (overrides.notFound) {
    service.getShowPlatformById.mockRejectedValue(new Error('not found'));
  }

  service.ensureValidActualTimeRange.mockImplementation(
    (currentStart: Date | null, currentEnd: Date | null, dto: any) => {
      const start = dto.actualStartTime !== undefined ? dto.actualStartTime : currentStart ?? null;
      const end = dto.actualEndTime !== undefined ? dto.actualEndTime : currentEnd ?? null;
      if (start && end && end <= start) {
        throw new Error('Actual end time must be after actual start time');
      }
    },
  );

  return service as jest.Mocked<ShowPlatformService>;
}

const ctx = {
  taskId: 1n,
  taskUid: 'task_alpha',
  studioId: 1n,
  showId: 10n,
  showUid: 'sho_10',
  source: 'OPERATOR' as const,
};

const fact = {
  contentKey: 'fld_plat_end:platform:show_plt_200',
  sourceFieldId: 'fld_plat_end',
  factKey: 'show_platform_actual_end_time' as const,
  scope: 'platform' as const,
  targetUid: 'show_plt_200',
  rawValue: '2026-05-23T19:30:00.000Z',
};

describe('showPlatformActualEndTimeExtractor', () => {
  it('writes a CREATE decision when the column is blank', async () => {
    const showPlatformService = buildShowPlatformService({});
    const extractor = new ShowPlatformActualEndTimeExtractor(showPlatformService);

    const decision = await extractor.apply(fact, ctx);

    expect(decision).toMatchObject({
      kind: 'write',
      action: 'CREATE',
      oldValue: null,
      newValue: '2026-05-23T19:30:00.000Z',
    });
    expect(showPlatformService.updateActuals).toHaveBeenCalledWith(
      'show_plt_200',
      expect.objectContaining({
        actualEndTime: new Date('2026-05-23T19:30:00.000Z'),
        metadata: expect.objectContaining({
          actuals_source: { show_platform_actual_end_time: 'OPERATOR' },
        }),
      }),
    );
  });

  it('skips when an existing MANAGER override outranks the OPERATOR input', async () => {
    const showPlatformService = buildShowPlatformService({
      actualEndTime: new Date('2026-05-23T17:00:00.000Z'),
      metadata: { actuals_source: { show_platform_actual_end_time: 'MANAGER' } },
    });
    const extractor = new ShowPlatformActualEndTimeExtractor(showPlatformService);

    const decision = await extractor.apply(fact, ctx);

    expect(decision).toMatchObject({
      kind: 'skip',
      action: 'SKIPPED_LOWER_PRIORITY',
      skippedBy: 'MANAGER',
    });
    expect(showPlatformService.updateActuals).not.toHaveBeenCalled();
  });

  it('returns a noop when the value matches the current column and source', async () => {
    const showPlatformService = buildShowPlatformService({
      actualEndTime: new Date('2026-05-23T19:30:00.000Z'),
      metadata: { actuals_source: { show_platform_actual_end_time: 'OPERATOR' } },
    });
    const extractor = new ShowPlatformActualEndTimeExtractor(showPlatformService);

    const decision = await extractor.apply(fact, ctx);

    expect(decision).toEqual({ kind: 'noop', reason: 'value_unchanged' });
    expect(showPlatformService.updateActuals).not.toHaveBeenCalled();
  });

  it('returns target_stale when the show platform was soft-deleted', async () => {
    const showPlatformService = buildShowPlatformService({ notFound: true });
    const extractor = new ShowPlatformActualEndTimeExtractor(showPlatformService);

    const decision = await extractor.apply(fact, ctx);

    expect(decision).toEqual({ kind: 'noop', reason: 'target_stale' });
    expect(showPlatformService.updateActuals).not.toHaveBeenCalled();
  });

  it('returns target_stale when the show platform belongs to a different show', async () => {
    const showPlatformService = buildShowPlatformService({ showId: 999n });
    const extractor = new ShowPlatformActualEndTimeExtractor(showPlatformService);

    const decision = await extractor.apply(fact, ctx);

    expect(decision).toEqual({ kind: 'noop', reason: 'target_stale' });
    expect(showPlatformService.updateActuals).not.toHaveBeenCalled();
  });

  it('throws an error when the end time is before the stored start time', async () => {
    const showPlatformService = buildShowPlatformService({
      actualStartTime: new Date('2026-05-23T20:00:00.000Z'),
    });
    const extractor = new ShowPlatformActualEndTimeExtractor(showPlatformService);

    await expect(extractor.apply(fact, ctx)).rejects.toThrow(
      'Actual end time must be after actual start time',
    );
    expect(showPlatformService.updateActuals).not.toHaveBeenCalled();
  });

  it('stays a noop on resubmission even when the stored pair is already inverted', async () => {
    const showPlatformService = buildShowPlatformService({
      actualStartTime: new Date('2026-05-23T20:00:00.000Z'),
      actualEndTime: new Date('2026-05-23T19:30:00.000Z'),
      metadata: { actuals_source: { show_platform_actual_end_time: 'OPERATOR' } },
    });
    const extractor = new ShowPlatformActualEndTimeExtractor(showPlatformService);

    const decision = await extractor.apply(fact, ctx);

    expect(decision).toEqual({ kind: 'noop', reason: 'value_unchanged' });
    expect(showPlatformService.updateActuals).not.toHaveBeenCalled();
    expect(showPlatformService.ensureValidActualTimeRange).not.toHaveBeenCalled();
  });
});
