import { NotFoundException } from '@nestjs/common';

import { CreatorAttendanceMissingExtractor } from './creator-attendance-missing.extractor';

import type { ShowCreatorService } from '@/models/show-creator/show-creator.service';

type ShowCreatorServiceMock = Pick<
  jest.Mocked<ShowCreatorService>,
  'getShowCreatorById' | 'updateActuals'
>;

function buildShowCreatorService(overrides: {
  metadata?: Record<string, unknown>;
  attendanceMissing?: boolean;
  attendanceReason?: string | null;
  showId?: bigint;
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
      attendanceMissing: overrides.attendanceMissing ?? false,
      attendanceReason: overrides.attendanceReason ?? null,
    } as never);
  }

  return {
    getShowCreatorById,
    updateActuals: jest.fn().mockResolvedValue(undefined as never),
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
  contentKey: 'fld_attendmiss1:creator:show_mc_alpha',
  sourceFieldId: 'fld_attendmiss1',
  factKey: 'creator_attendance_missing' as const,
  scope: 'creator' as const,
  targetUid: 'show_mc_alpha',
  rawValue: true,
  reason: 'Sick leave.',
};

describe('creatorAttendanceMissingExtractor', () => {
  it('sets attendanceMissing with the operator reason when checked', async () => {
    const showCreatorService = buildShowCreatorService({});
    const extractor = new CreatorAttendanceMissingExtractor(
      showCreatorService as unknown as ShowCreatorService,
    );

    const decision = await extractor.apply(fact, ctx);

    expect(decision).toMatchObject({
      kind: 'write',
      action: 'UPDATE',
      oldValue: false,
      newValue: true,
    });
    expect(showCreatorService.updateActuals).toHaveBeenCalledWith(
      'show_mc_alpha',
      10n,
      expect.objectContaining({
        attendanceMissing: true,
        attendanceReason: 'Sick leave.',
        metadata: expect.objectContaining({
          actuals_source: { creator_attendance_missing: 'OPERATOR' },
        }),
      }),
    );
  });

  it('uses a system fallback reason when checked without a sidecar reason', async () => {
    const showCreatorService = buildShowCreatorService({});
    const extractor = new CreatorAttendanceMissingExtractor(
      showCreatorService as unknown as ShowCreatorService,
    );

    await extractor.apply({ ...fact, reason: undefined }, ctx);

    expect(showCreatorService.updateActuals).toHaveBeenCalledWith(
      'show_mc_alpha',
      10n,
      expect.objectContaining({
        attendanceReason: 'Missing attendance reason was not provided by the task field.',
      }),
    );
  });

  it('treats false as a meaningful value and clears the missing reason', async () => {
    const showCreatorService = buildShowCreatorService({
      attendanceMissing: true,
      attendanceReason: 'Old no-show reason',
      metadata: { actuals_source: { creator_attendance_missing: 'OPERATOR' } },
    });
    const extractor = new CreatorAttendanceMissingExtractor(
      showCreatorService as unknown as ShowCreatorService,
    );

    const decision = await extractor.apply({ ...fact, rawValue: false, reason: undefined }, ctx);

    expect(decision).toMatchObject({
      kind: 'write',
      action: 'UPDATE',
      oldValue: true,
      newValue: false,
    });
    expect(showCreatorService.updateActuals).toHaveBeenCalledWith(
      'show_mc_alpha',
      10n,
      expect.objectContaining({
        attendanceMissing: false,
        attendanceReason: null,
      }),
    );
  });

  it('returns value_unchanged when the marker and source already match', async () => {
    const showCreatorService = buildShowCreatorService({
      attendanceMissing: true,
      attendanceReason: 'Sick leave.',
      metadata: { actuals_source: { creator_attendance_missing: 'OPERATOR' } },
    });
    const extractor = new CreatorAttendanceMissingExtractor(
      showCreatorService as unknown as ShowCreatorService,
    );

    const decision = await extractor.apply(fact, ctx);

    expect(decision).toEqual({ kind: 'noop', reason: 'value_unchanged' });
    expect(showCreatorService.updateActuals).not.toHaveBeenCalled();
  });

  it('returns target_stale when the assignment is missing', async () => {
    const showCreatorService = buildShowCreatorService({ notFound: true });
    const extractor = new CreatorAttendanceMissingExtractor(
      showCreatorService as unknown as ShowCreatorService,
    );

    const decision = await extractor.apply(fact, ctx);

    expect(decision).toEqual({ kind: 'noop', reason: 'target_stale' });
  });

  it('preserves attendanceReason on a false write when the start extractor is co-submitted', async () => {
    // Regression for Codex P1: `attendanceReason` is shared with
    // `creator_actual_start_time`. When the start extractor is also
    // submitted in this run, this extractor's false-write must NOT
    // clear the column — the start extractor's (possibly late) reason
    // owns it.
    const showCreatorService = buildShowCreatorService({
      attendanceMissing: true,
      attendanceReason: 'Late start reason from operator.',
      metadata: { actuals_source: {
        creator_attendance_missing: 'OPERATOR',
        creator_actual_start_time: 'OPERATOR',
      } },
    });
    const extractor = new CreatorAttendanceMissingExtractor(
      showCreatorService as unknown as ShowCreatorService,
    );

    const decision = await extractor.apply(
      {
        ...fact,
        rawValue: false,
        reason: undefined,
        coSubmittedFactKeysForTarget: new Set(['creator_actual_start_time']),
      },
      ctx,
    );

    expect(decision).toMatchObject({ kind: 'write', action: 'UPDATE' });
    const [, , payload] = showCreatorService.updateActuals.mock.calls[0]!;
    expect(payload).toEqual(expect.objectContaining({ attendanceMissing: false }));
    expect(payload).not.toHaveProperty('attendanceReason');
  });

  it('clears attendanceReason on a false write when only persisted metadata mentions the start extractor (no co-submission)', async () => {
    // Regression for Codex P2: ownership must be scoped to the current
    // extraction run. A historical `creator_actual_start_time` write in
    // persisted metadata must NOT keep a stale absence reason pinned
    // when the current submission only toggles attendance_missing off.
    const showCreatorService = buildShowCreatorService({
      attendanceMissing: true,
      attendanceReason: 'Sick leave.',
      metadata: { actuals_source: {
        creator_attendance_missing: 'OPERATOR',
        creator_actual_start_time: 'OPERATOR',
      } },
    });
    const extractor = new CreatorAttendanceMissingExtractor(
      showCreatorService as unknown as ShowCreatorService,
    );

    const decision = await extractor.apply(
      { ...fact, rawValue: false, reason: undefined },
      ctx,
    );

    expect(decision).toMatchObject({ kind: 'write', action: 'UPDATE' });
    expect(showCreatorService.updateActuals).toHaveBeenCalledWith(
      'show_mc_alpha',
      10n,
      expect.objectContaining({
        attendanceMissing: false,
        attendanceReason: null,
      }),
    );
  });

  it('flushes the corrected missing reason on a same-flag resubmission', async () => {
    // Regression for Codex P1: a first submission with no reason stores
    // the system fallback. A resubmission carrying the same `true` flag
    // and a real reason must still update `attendanceReason`; the
    // equality short-circuit cannot mask reason corrections.
    const showCreatorService = buildShowCreatorService({
      attendanceMissing: true,
      attendanceReason: 'Missing attendance reason was not provided by the task field.',
      metadata: { actuals_source: { creator_attendance_missing: 'OPERATOR' } },
    });
    const extractor = new CreatorAttendanceMissingExtractor(
      showCreatorService as unknown as ShowCreatorService,
    );

    const decision = await extractor.apply(
      { ...fact, reason: 'Sick leave.' },
      ctx,
    );

    expect(decision).toMatchObject({ kind: 'write', action: 'UPDATE' });
    expect(showCreatorService.updateActuals).toHaveBeenCalledWith(
      'show_mc_alpha',
      10n,
      expect.objectContaining({
        attendanceMissing: true,
        attendanceReason: 'Sick leave.',
      }),
    );
  });

  it('preserves an existing real reason when a same-flag resubmission omits the sidecar', async () => {
    // Regression for Codex P2: a retry that omits the reason sidecar
    // must NOT downgrade an existing real reason to the system
    // fallback. The reason column must stay untouched.
    const showCreatorService = buildShowCreatorService({
      attendanceMissing: true,
      attendanceReason: 'Sick leave.',
      metadata: { actuals_source: { creator_attendance_missing: 'OPERATOR' } },
    });
    const extractor = new CreatorAttendanceMissingExtractor(
      showCreatorService as unknown as ShowCreatorService,
    );

    const decision = await extractor.apply({ ...fact, reason: undefined }, ctx);

    expect(decision).toEqual({ kind: 'noop', reason: 'value_unchanged' });
    expect(showCreatorService.updateActuals).not.toHaveBeenCalled();
  });
});
