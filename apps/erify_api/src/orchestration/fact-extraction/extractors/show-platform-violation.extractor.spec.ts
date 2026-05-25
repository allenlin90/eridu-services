import { NotFoundException } from '@nestjs/common';

import { ShowPlatformViolationExtractor } from './show-platform-violation.extractor';

import type { ShowPlatformService } from '@/models/show-platform/show-platform.service';
import type { ShowPlatformViolationService } from '@/models/show-platform-violation/show-platform-violation.service';

function buildShowPlatformService(overrides: {
  showId?: bigint;
  notFound?: boolean;
} = {}): jest.Mocked<ShowPlatformService> {
  const service: any = {
    getShowPlatformById: jest.fn().mockResolvedValue({
      id: 200n,
      uid: 'show_plt_200',
      showId: overrides.showId ?? 10n,
    }),
  };

  if (overrides.notFound) {
    service.getShowPlatformById.mockRejectedValue(
      new NotFoundException('ShowPlatform not found'),
    );
  }

  return service as jest.Mocked<ShowPlatformService>;
}

function buildViolationService(overrides: {
  created?: unknown[];
  superseded?: unknown[];
} = {}): jest.Mocked<ShowPlatformViolationService> {
  return {
    replaceForTaskField: jest.fn().mockResolvedValue({
      created: overrides.created ?? [
        { uid: 'spv_new', violationType: 'COPYRIGHT', severity: 'WARNING' },
      ],
      superseded: overrides.superseded ?? [],
    }),
  } as unknown as jest.Mocked<ShowPlatformViolationService>;
}

const ctx = {
  taskId: 99n,
  taskUid: 'task_alpha',
  studioId: 1n,
  showId: 10n,
  showUid: 'sho_10',
  source: 'OPERATOR' as const,
};

const fact = {
  contentKey: 'fld_violate123:platform:show_plt_200',
  sourceFieldId: 'fld_violate123',
  factKey: 'show_platform_violation' as const,
  scope: 'platform' as const,
  targetUid: 'show_plt_200',
  rawValue: ['COPYRIGHT'],
  reason: 'Copyright warning from platform',
};

describe('showPlatformViolationExtractor', () => {
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-05-23T18:30:00.000Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('replaces task-field scoped violations for the hydrated platform field', async () => {
    const showPlatformService = buildShowPlatformService();
    const violationService = buildViolationService();
    const extractor = new ShowPlatformViolationExtractor(
      showPlatformService,
      violationService,
    );

    const decision = await extractor.apply(fact, ctx);

    expect(violationService.replaceForTaskField).toHaveBeenCalledWith({
      showId: 10n,
      showPlatformId: 200n,
      sourceTaskId: 99n,
      sourceFieldId: 'fld_violate123:platform:show_plt_200',
      entries: [
        {
          violationType: 'COPYRIGHT',
          severity: 'WARNING',
          reason: 'Copyright warning from platform',
          observedAt: new Date('2026-05-23T18:30:00.000Z'),
          metadata: {
            ingestion_source: 'task_submission',
            task_uid: 'task_alpha',
            task_field_id: 'fld_violate123',
          },
        },
      ],
    });
    expect(decision).toMatchObject({
      kind: 'write',
      action: 'CREATE',
      oldValue: [],
      newValue: [{ violation_type: 'COPYRIGHT', severity: 'WARNING' }],
    });
  });

  it('clears prior violations when the operator submits an empty multiselect', async () => {
    const showPlatformService = buildShowPlatformService();
    const violationService = buildViolationService({
      created: [],
      superseded: [{ uid: 'spv_old', violationType: 'COPYRIGHT', severity: 'WARNING' }],
    });
    const extractor = new ShowPlatformViolationExtractor(
      showPlatformService,
      violationService,
    );

    const decision = await extractor.apply({ ...fact, rawValue: [] }, ctx);

    expect(violationService.replaceForTaskField).toHaveBeenCalledWith(
      expect.objectContaining({ entries: [] }),
    );
    expect(decision).toMatchObject({
      kind: 'write',
      action: 'UPDATE',
      oldValue: [{ violation_type: 'COPYRIGHT', severity: 'WARNING' }],
      newValue: [],
    });
  });

  it('returns value_unchanged when an empty submission had nothing to supersede', async () => {
    const showPlatformService = buildShowPlatformService();
    const violationService = buildViolationService({ created: [], superseded: [] });
    const extractor = new ShowPlatformViolationExtractor(
      showPlatformService,
      violationService,
    );

    const decision = await extractor.apply({ ...fact, rawValue: [] }, ctx);

    expect(decision).toEqual({ kind: 'noop', reason: 'value_unchanged' });
  });

  it('returns target_stale when the platform is no longer assigned to the show', async () => {
    const showPlatformService = buildShowPlatformService({ showId: 11n });
    const violationService = buildViolationService();
    const extractor = new ShowPlatformViolationExtractor(
      showPlatformService,
      violationService,
    );

    const decision = await extractor.apply(fact, ctx);

    expect(decision).toEqual({ kind: 'noop', reason: 'target_stale' });
    expect(violationService.replaceForTaskField).not.toHaveBeenCalled();
  });

  it('collapses NotFoundException from the platform lookup to target_stale', async () => {
    const showPlatformService = buildShowPlatformService({ notFound: true });
    const violationService = buildViolationService();
    const extractor = new ShowPlatformViolationExtractor(
      showPlatformService,
      violationService,
    );

    const decision = await extractor.apply(fact, ctx);

    expect(decision).toEqual({ kind: 'noop', reason: 'target_stale' });
    expect(violationService.replaceForTaskField).not.toHaveBeenCalled();
  });

  it('propagates non-NotFound platform lookup errors', async () => {
    const showPlatformService = buildShowPlatformService();
    showPlatformService.getShowPlatformById.mockRejectedValue(new Error('connection refused'));
    const violationService = buildViolationService();
    const extractor = new ShowPlatformViolationExtractor(
      showPlatformService,
      violationService,
    );

    await expect(extractor.apply(fact, ctx)).rejects.toThrow('connection refused');
  });

  it('collapses NotFoundException from the write path to target_stale', async () => {
    const showPlatformService = buildShowPlatformService();
    const violationService = buildViolationService();
    violationService.replaceForTaskField.mockRejectedValue(
      new NotFoundException('ShowPlatform 200 is not active under show 10'),
    );
    const extractor = new ShowPlatformViolationExtractor(
      showPlatformService,
      violationService,
    );

    const decision = await extractor.apply(fact, ctx);

    expect(decision).toEqual({ kind: 'noop', reason: 'target_stale' });
  });

  it('propagates non-NotFound write errors as extractor errors', async () => {
    const showPlatformService = buildShowPlatformService();
    const violationService = buildViolationService();
    violationService.replaceForTaskField.mockRejectedValue(new Error('db down'));
    const extractor = new ShowPlatformViolationExtractor(
      showPlatformService,
      violationService,
    );

    await expect(extractor.apply(fact, ctx)).rejects.toThrow('db down');
  });
});
