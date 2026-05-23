import { ShowActualStartTimeExtractor } from './show-actual-start-time.extractor';

import type { ShowService } from '@/models/show/show.service';

function buildShowService(overrides: {
  metadata?: Record<string, unknown>;
  actualStartTime?: Date | null;
}): jest.Mocked<ShowService> {
  return {
    getShowById: jest.fn().mockResolvedValue({
      id: 10n,
      uid: 'sho_10',
      metadata: overrides.metadata ?? {},
      actualStartTime: overrides.actualStartTime ?? null,
    }),
    updateShow: jest.fn().mockResolvedValue({} as never),
  } as never;
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
});
