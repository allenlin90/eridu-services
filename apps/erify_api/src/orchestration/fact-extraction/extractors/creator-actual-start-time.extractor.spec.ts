import { NotFoundException } from '@nestjs/common';

import { CreatorActualStartTimeExtractor } from './creator-actual-start-time.extractor';

import type { ShowCreatorService } from '@/models/show-creator/show-creator.service';

type ShowCreatorServiceMock = Pick<
  jest.Mocked<ShowCreatorService>,
  'getShowCreatorById' | 'updateActuals' | 'ensureValidActualTimeRange'
>;

function buildShowCreatorService(overrides: {
  metadata?: Record<string, unknown>;
  actualStartTime?: Date | null;
  actualEndTime?: Date | null;
  attendanceMissing?: boolean;
  attendanceReason?: string | null;
  showId?: bigint;
  showStartTime?: Date;
  notFound?: boolean;
}): ShowCreatorServiceMock {
  const getShowCreatorById = jest.fn();
  if (overrides.notFound) {
    getShowCreatorById.mockRejectedValue(new NotFoundException('ShowCreator not found'));
  } else {
    getShowCreatorById.mockResolvedValue({
      id: 101n,
      uid: 'show_mc_alpha',
      showId: overrides.showId ?? 10n,
      metadata: overrides.metadata ?? {},
      actualStartTime: overrides.actualStartTime ?? null,
      actualEndTime: overrides.actualEndTime ?? null,
      attendanceMissing: overrides.attendanceMissing ?? false,
      attendanceReason: overrides.attendanceReason ?? null,
      show: {
        startTime: overrides.showStartTime ?? new Date('2026-05-23T12:00:00.000Z'),
      },
    } as never);
  }

  const ensureValidActualTimeRange = jest.fn<
    void,
    Parameters<ShowCreatorService['ensureValidActualTimeRange']>
  >((currentStart, currentEnd, dto) => {
    const start = dto.actualStartTime !== undefined ? dto.actualStartTime : currentStart ?? null;
    const end = dto.actualEndTime !== undefined ? dto.actualEndTime : currentEnd ?? null;
    if (start && end && end <= start) {
      throw new Error('Actual end time must be after actual start time');
    }
  });

  return {
    getShowCreatorById,
    updateActuals: jest.fn().mockResolvedValue(undefined as never),
    ensureValidActualTimeRange,
  } as ShowCreatorServiceMock;
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
  contentKey: 'fld_creatorstart1:creator:show_mc_alpha',
  sourceFieldId: 'fld_creatorstart1',
  factKey: 'creator_actual_start_time' as const,
  scope: 'creator' as const,
  targetUid: 'show_mc_alpha',
  rawValue: '2026-05-23T12:30:00.000Z',
  reason: 'Transport delay.',
};

describe('creatorActualStartTimeExtractor', () => {
  it('writes creator actual start time and late reason when start is after show start', async () => {
    const showCreatorService = buildShowCreatorService({});
    const extractor = new CreatorActualStartTimeExtractor(showCreatorService as unknown as ShowCreatorService);

    const decision = await extractor.apply(fact, ctx);

    expect(decision).toMatchObject({
      kind: 'write',
      action: 'CREATE',
      oldValue: null,
      newValue: '2026-05-23T12:30:00.000Z',
    });
    expect(showCreatorService.updateActuals).toHaveBeenCalledWith(
      'show_mc_alpha',
      10n,
      expect.objectContaining({
        actualStartTime: new Date('2026-05-23T12:30:00.000Z'),
        attendanceReason: 'Transport delay.',
        metadata: expect.objectContaining({
          actuals_source: { creator_actual_start_time: 'OPERATOR' },
        }),
      }),
    );
  });

  it('uses a system fallback reason for late starts when the sidecar is missing', async () => {
    const showCreatorService = buildShowCreatorService({});
    const extractor = new CreatorActualStartTimeExtractor(showCreatorService as unknown as ShowCreatorService);

    await extractor.apply({ ...fact, reason: undefined }, ctx);

    expect(showCreatorService.updateActuals).toHaveBeenCalledWith(
      'show_mc_alpha',
      10n,
      expect.objectContaining({
        attendanceReason: 'Late attendance reason was not provided by the task field.',
      }),
    );
  });

  it('does not require a reason for on-time starts', async () => {
    const showCreatorService = buildShowCreatorService({
      showStartTime: new Date('2026-05-23T12:30:00.000Z'),
    });
    const extractor = new CreatorActualStartTimeExtractor(showCreatorService as unknown as ShowCreatorService);

    await extractor.apply({ ...fact, reason: undefined }, ctx);

    expect(showCreatorService.updateActuals).toHaveBeenCalledWith(
      'show_mc_alpha',
      10n,
      expect.not.objectContaining({ attendanceReason: expect.anything() }),
    );
  });

  it('returns target_stale when the assignment no longer belongs to the show', async () => {
    const showCreatorService = buildShowCreatorService({ showId: 999n });
    const extractor = new CreatorActualStartTimeExtractor(showCreatorService as unknown as ShowCreatorService);

    const decision = await extractor.apply(fact, ctx);

    expect(decision).toEqual({ kind: 'noop', reason: 'target_stale' });
    expect(showCreatorService.updateActuals).not.toHaveBeenCalled();
  });

  it('propagates non-NotFound errors from reads', async () => {
    const showCreatorService = buildShowCreatorService({});
    showCreatorService.getShowCreatorById.mockRejectedValue(new Error('connection refused'));
    const extractor = new CreatorActualStartTimeExtractor(showCreatorService as unknown as ShowCreatorService);

    await expect(extractor.apply(fact, ctx)).rejects.toThrow('connection refused');
  });
});
