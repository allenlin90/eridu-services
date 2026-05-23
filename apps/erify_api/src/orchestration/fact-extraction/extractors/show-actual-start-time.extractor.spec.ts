import { ShowActualStartTimeExtractor } from './show-actual-start-time.extractor';

import type { ShowService } from '@/models/show/show.service';

function buildShowService(overrides: {
  metadata?: Record<string, unknown>;
  actualStartTime?: Date | null;
  actualEndTime?: Date | null;
}): jest.Mocked<ShowService> {
  const service: any = {
    getShowById: jest.fn().mockResolvedValue({
      id: 10n,
      uid: 'sho_10',
      metadata: overrides.metadata ?? {},
      actualStartTime: overrides.actualStartTime ?? null,
      actualEndTime: overrides.actualEndTime ?? null,
    }),
    updateShow: jest.fn().mockResolvedValue({} as never),
    ensureValidActualTimeRange: jest.fn(),
  };

  service.ensureValidActualTimeRange.mockImplementation(
    (currentStart: Date | null, currentEnd: Date | null, dto: any) => {
      const start = dto.actualStartTime !== undefined ? dto.actualStartTime : currentStart ?? null;
      const end = dto.actualEndTime !== undefined ? dto.actualEndTime : currentEnd ?? null;
      if (start && end && end <= start) {
        throw new Error('Actual end time must be after actual start time');
      }
    },
  );

  return service as jest.Mocked<ShowService>;
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
  contentKey: 'fld_show_start',
  sourceFieldId: 'fld_show_start',
  factKey: 'show_actual_start_time' as const,
  scope: 'show' as const,
  targetUid: 'sho_10',
  rawValue: '2026-05-23T18:30:00.000Z',
};

describe('showActualStartTimeExtractor', () => {
  it('writes a CREATE decision when the column is blank', async () => {
    const showService = buildShowService({});
    const extractor = new ShowActualStartTimeExtractor(showService);

    const decision = await extractor.apply(fact, ctx);

    expect(decision).toMatchObject({
      kind: 'write',
      action: 'CREATE',
      oldValue: null,
      newValue: '2026-05-23T18:30:00.000Z',
    });
    expect(showService.updateShow).toHaveBeenCalledWith(
      'sho_10',
      expect.objectContaining({
        actualStartTime: new Date('2026-05-23T18:30:00.000Z'),
        metadata: expect.objectContaining({
          actuals_source: { show_actual_start_time: 'OPERATOR' },
        }),
      }),
    );
  });

  it('writes an UPDATE decision when the column already has a value', async () => {
    const showService = buildShowService({
      actualStartTime: new Date('2026-05-23T17:00:00.000Z'),
      metadata: { actuals_source: { show_actual_start_time: 'OPERATOR' } },
    });
    const extractor = new ShowActualStartTimeExtractor(showService);

    const decision = await extractor.apply(fact, ctx);

    expect(decision).toMatchObject({
      kind: 'write',
      action: 'UPDATE',
      oldValue: '2026-05-23T17:00:00.000Z',
      newValue: '2026-05-23T18:30:00.000Z',
    });
  });

  it('skips when an existing MANAGER override outranks the OPERATOR input', async () => {
    const showService = buildShowService({
      actualStartTime: new Date('2026-05-23T17:00:00.000Z'),
      metadata: { actuals_source: { show_actual_start_time: 'MANAGER' } },
    });
    const extractor = new ShowActualStartTimeExtractor(showService);

    const decision = await extractor.apply(fact, ctx);

    expect(decision).toMatchObject({
      kind: 'skip',
      action: 'SKIPPED_LOWER_PRIORITY',
      skippedBy: 'MANAGER',
    });
    expect(showService.updateShow).not.toHaveBeenCalled();
  });

  it('returns a noop when the operator left the field blank', async () => {
    const showService = buildShowService({});
    const extractor = new ShowActualStartTimeExtractor(showService);

    const decision = await extractor.apply({ ...fact, rawValue: '' }, ctx);

    expect(decision).toEqual({ kind: 'noop', reason: 'value_absent' });
    expect(showService.updateShow).not.toHaveBeenCalled();
  });

  it('returns a noop when the value matches the current column and source', async () => {
    const showService = buildShowService({
      actualStartTime: new Date('2026-05-23T18:30:00.000Z'),
      metadata: { actuals_source: { show_actual_start_time: 'OPERATOR' } },
    });
    const extractor = new ShowActualStartTimeExtractor(showService);

    const decision = await extractor.apply(fact, ctx);

    expect(decision).toEqual({ kind: 'noop', reason: 'value_unchanged' });
    expect(showService.updateShow).not.toHaveBeenCalled();
  });

  it('throws an error when the start time is after the end time', async () => {
    const showService = buildShowService({
      actualEndTime: new Date('2026-05-23T17:00:00.000Z'),
    });
    const extractor = new ShowActualStartTimeExtractor(showService);

    await expect(extractor.apply(fact, ctx)).rejects.toThrow(
      'Actual end time must be after actual start time',
    );
    expect(showService.updateShow).not.toHaveBeenCalled();
  });

  it('accepts a paired same-submission edit that would be invalid against the stored end', async () => {
    // Stored: 10:00-11:00. Incoming pair: 12:00-13:00. If validation paired
    // the new start against the stored end (11:00), it would reject the
    // write even though the merged submission is a valid range.
    const showService = buildShowService({
      actualStartTime: new Date('2026-05-23T10:00:00.000Z'),
      actualEndTime: new Date('2026-05-23T11:00:00.000Z'),
    });
    const extractor = new ShowActualStartTimeExtractor(showService);
    const pairedCtx = {
      ...ctx,
      incomingShowActuals: {
        actualStartTime: new Date('2026-05-23T12:00:00.000Z'),
        actualEndTime: new Date('2026-05-23T13:00:00.000Z'),
      },
    };

    const decision = await extractor.apply(
      { ...fact, rawValue: '2026-05-23T12:00:00.000Z' },
      pairedCtx,
    );

    expect(decision).toMatchObject({
      kind: 'write',
      action: 'UPDATE',
      newValue: '2026-05-23T12:00:00.000Z',
    });
    expect(showService.ensureValidActualTimeRange).toHaveBeenCalledWith(
      new Date('2026-05-23T10:00:00.000Z'),
      new Date('2026-05-23T11:00:00.000Z'),
      expect.objectContaining({
        actualStartTime: new Date('2026-05-23T12:00:00.000Z'),
        actualEndTime: new Date('2026-05-23T13:00:00.000Z'),
      }),
    );
  });
});
