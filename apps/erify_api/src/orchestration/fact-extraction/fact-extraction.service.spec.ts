import { TaskStatus } from '@prisma/client';

import type { IngestionExtractor } from './extractors/extractor.types';
import type { ExtractorRegistry } from './extractors/extractor-registry';
import type { FactExtractionProcessor, ProcessedFact } from './fact-extraction.processor';
import { FactExtractionService } from './fact-extraction.service';

import type { AuditService } from '@/models/audit/audit.service';
import type { ShowPlatformService } from '@/models/show-platform/show-platform.service';
import type { TaskService } from '@/models/task/task.service';

function buildTaskWithSnapshot(overrides?: Partial<{
  uid: string;
  status: TaskStatus;
  content: Record<string, unknown>;
  schema: { items: Array<{ id: string; system_fact_key?: string }> };
}>) {
  const schema = overrides?.schema ?? {
    items: [
      { id: 'fld_show_start', system_fact_key: 'show_actual_start_time' },
    ],
  };
  return {
    uid: overrides?.uid ?? 'task_alpha',
    status: overrides?.status ?? TaskStatus.COMPLETED,
    content: overrides?.content ?? { fld_show_start: '2026-05-23T18:30:00.000Z' },
    snapshot: { schema },
  } as never;
}

function buildExtractor(
  overrides: { applyMock?: jest.Mock; factKey?: string } = {},
): jest.Mocked<IngestionExtractor> {
  return {
    factKey: (overrides.factKey ?? 'show_actual_start_time') as IngestionExtractor['factKey'],
    apply: overrides.applyMock ?? jest.fn(),
  } as jest.Mocked<IngestionExtractor>;
}

function buildRegistry(extractor: IngestionExtractor): ExtractorRegistry {
  return {
    resolve: jest.fn((factKey: string) => (extractor.factKey === factKey ? extractor : undefined)),
    has: jest.fn((factKey: string) => extractor.factKey === factKey),
    registeredFactKeys: jest.fn(() => [extractor.factKey]),
  } as unknown as ExtractorRegistry;
}

describe('factExtractionService', () => {
  let service: FactExtractionService;
  let taskService: jest.Mocked<TaskService>;
  let auditService: jest.Mocked<AuditService>;
  let extractor: jest.Mocked<IngestionExtractor>;
  let registry: ExtractorRegistry;
  let processor: jest.Mocked<FactExtractionProcessor>;
  let showPlatformService: jest.Mocked<ShowPlatformService>;

  beforeEach(() => {
    extractor = buildExtractor();
    registry = buildRegistry(extractor);
    taskService = {
      findByUidWithSnapshot: jest.fn(),
      findActiveTasksForShowExcluding: jest.fn().mockResolvedValue([]),
    } as never;
    auditService = {
      create: jest.fn(async (payload) => ({ uid: `aud_${payload.action}` }) as never),
    } as never;
    processor = {
      // Default: delegate to the configured extractor mock so callers can drive
      // decisions via `extractor.apply.mockResolvedValue(...)` exactly as
      // before. Audit uid is synthesized from the decision so the tests can
      // assert it deterministically.
      applyAndAudit: jest.fn(async (ext, fact, ctx, targetIds): Promise<ProcessedFact> => {
        const decision = await ext.apply(fact, ctx);
        if (decision.kind === 'noop' || targetIds.length === 0) {
          return { decision };
        }
        return { decision, auditUid: `aud_${decision.action}` };
      }),
      // Default atomic-paired-actuals behavior: both sides "write" with
      // synthesized audit uids. Tests that need other outcomes override
      // `applyPairedShowActuals` directly.
      applyPairedShowActuals: jest.fn(async () => ({
        start: {
          decision: { kind: 'write', action: 'CREATE', oldValue: null, newValue: 'start' },
          auditUid: 'aud_paired_start',
        },
        end: {
          decision: { kind: 'write', action: 'CREATE', oldValue: null, newValue: 'end' },
          auditUid: 'aud_paired_end',
        },
      } as never)),
      // Default per-target paired ShowPlatform behavior — mirrors the show
      // counterpart. Tests that exercise platform-paired override directly.
      applyPairedShowPlatformActuals: jest.fn(async () => ({
        start: {
          decision: { kind: 'write', action: 'CREATE', oldValue: null, newValue: 'start' },
          auditUid: 'aud_paired_platform_start',
        },
        end: {
          decision: { kind: 'write', action: 'CREATE', oldValue: null, newValue: 'end' },
          auditUid: 'aud_paired_platform_end',
        },
      } as never)),
    } as never;
    showPlatformService = {
      // Default: no platform targets resolve. Platform-scope tests override
      // this with the targets they expect to be active.
      findActiveByUids: jest.fn().mockResolvedValue(new Map()),
    } as never;
    service = new FactExtractionService(taskService, auditService, registry, processor, showPlatformService);
  });

  it('returns an empty result when the task has no snapshot', async () => {
    taskService.findByUidWithSnapshot.mockResolvedValue(null);
    const result = await service.extractFromTask({
      taskId: 1n,
      taskUid: 'task_x',
      studioId: 1n,
      showId: 10n,
      showUid: 'sho_10',
      source: 'OPERATOR',
    });
    expect(result.entries).toEqual([]);
    expect(extractor.apply).not.toHaveBeenCalled();
  });

  it('routes show-scoped bindings to the extractor and persists a write audit', async () => {
    taskService.findByUidWithSnapshot.mockResolvedValue(buildTaskWithSnapshot());
    extractor.apply.mockResolvedValue({
      kind: 'write',
      action: 'CREATE',
      oldValue: null,
      newValue: '2026-05-23T18:30:00.000Z',
    });

    const result = await service.extractFromTask({
      taskId: 99n,
      taskUid: 'task_alpha',
      studioId: 1n,
      showId: 10n,
      showUid: 'sho_10',
      source: 'OPERATOR',
    });

    expect(processor.applyAndAudit).toHaveBeenCalledTimes(1);
    expect(processor.applyAndAudit).toHaveBeenCalledWith(
      extractor,
      expect.objectContaining({ factKey: 'show_actual_start_time' }),
      expect.objectContaining({ showUid: 'sho_10', source: 'OPERATOR' }),
      [{ targetType: 'SHOW', targetId: 10n }],
    );
    expect(result.entries).toEqual([
      expect.objectContaining({
        factKey: 'show_actual_start_time',
        outcome: 'written',
        auditUid: 'aud_CREATE',
        targetUid: 'sho_10',
      }),
    ]);
  });

  it('routes a paired show-actuals submission through the atomic processor and skips per-fact extractor calls', async () => {
    // Codex P1 review on PR #101: paired-validation in the per-fact loop
    // was racy under collisions, priority skips, and extractor errors. The
    // service must hand both fact keys to the atomic processor in a single
    // call so the priority check + merged-pair validation + paired column
    // write all commit (or roll back) together.
    const startExtractor = buildExtractor({ factKey: 'show_actual_start_time' });
    const endExtractor = buildExtractor({ factKey: 'show_actual_end_time' });
    const pairedRegistry = {
      resolve: jest.fn((factKey: string) => {
        if (factKey === 'show_actual_start_time')
          return startExtractor;
        if (factKey === 'show_actual_end_time')
          return endExtractor;
        return undefined;
      }),
      has: jest.fn((factKey: string) =>
        factKey === 'show_actual_start_time' || factKey === 'show_actual_end_time',
      ),
      registeredFactKeys: jest.fn(() => ['show_actual_start_time', 'show_actual_end_time']),
    } as unknown as ExtractorRegistry;
    const pairedService = new FactExtractionService(
      taskService,
      auditService,
      pairedRegistry,
      processor,
      showPlatformService,
    );
    taskService.findByUidWithSnapshot.mockResolvedValue(buildTaskWithSnapshot({
      schema: {
        items: [
          { id: 'fld_show_start', system_fact_key: 'show_actual_start_time' },
          { id: 'fld_show_end', system_fact_key: 'show_actual_end_time' },
        ],
      },
      content: {
        fld_show_start: '2026-05-23T12:00:00.000Z',
        fld_show_end: '2026-05-23T13:00:00.000Z',
      },
    }));

    const result = await pairedService.extractFromTask({
      taskId: 99n,
      taskUid: 'task_alpha',
      studioId: 1n,
      showId: 10n,
      showUid: 'sho_10',
      source: 'OPERATOR',
    });

    expect(processor.applyPairedShowActuals).toHaveBeenCalledTimes(1);
    expect(processor.applyPairedShowActuals).toHaveBeenCalledWith(
      expect.objectContaining({
        startIncoming: new Date('2026-05-23T12:00:00.000Z'),
        endIncoming: new Date('2026-05-23T13:00:00.000Z'),
        ctx: expect.objectContaining({ showUid: 'sho_10', source: 'OPERATOR' }),
        targetIds: [{ targetType: 'SHOW', targetId: 10n }],
      }),
    );
    // The per-fact extractor path is bypassed entirely for paired keys —
    // the atomic processor owns the show read, priority check, and write.
    expect(startExtractor.apply).not.toHaveBeenCalled();
    expect(endExtractor.apply).not.toHaveBeenCalled();
    expect(processor.applyAndAudit).not.toHaveBeenCalled();
    expect(result.entries).toEqual(expect.arrayContaining([
      expect.objectContaining({ factKey: 'show_actual_start_time', outcome: 'written' }),
      expect.objectContaining({ factKey: 'show_actual_end_time', outcome: 'written' }),
    ]));
  });

  it('falls back to the per-fact loop when only one paired actuals fact is in the submission', async () => {
    // One-sided updates do not benefit from the atomic path — the per-
    // extractor flow already validates against the stored counterpart
    // correctly. Routing through `applyPairedShowActuals` would force the
    // caller to pass an unparseable / absent fact, which is contractually
    // invalid for that method.
    taskService.findByUidWithSnapshot.mockResolvedValue(buildTaskWithSnapshot({
      schema: {
        items: [{ id: 'fld_show_start', system_fact_key: 'show_actual_start_time' }],
      },
      content: { fld_show_start: '2026-05-23T18:30:00.000Z' },
    }));
    extractor.apply.mockResolvedValue({
      kind: 'write',
      action: 'CREATE',
      oldValue: null,
      newValue: '2026-05-23T18:30:00.000Z',
    });

    await service.extractFromTask({
      taskId: 99n,
      taskUid: 'task_alpha',
      studioId: 1n,
      showId: 10n,
      showUid: 'sho_10',
      source: 'OPERATOR',
    });

    expect(processor.applyPairedShowActuals).not.toHaveBeenCalled();
    expect(processor.applyAndAudit).toHaveBeenCalledTimes(1);
  });

  it('falls back to the per-fact loop when one paired side collides with an active sibling task', async () => {
    // Collisions are handled at the service level via the collision-skip
    // audit path; the atomic processor only runs when both sides can
    // actually compete for their writes. The non-colliding side still
    // flows through the existing per-extractor path.
    const startExtractor = buildExtractor({ factKey: 'show_actual_start_time' });
    const endExtractor = buildExtractor({ factKey: 'show_actual_end_time' });
    const pairedRegistry = {
      resolve: jest.fn((factKey: string) => {
        if (factKey === 'show_actual_start_time')
          return startExtractor;
        if (factKey === 'show_actual_end_time')
          return endExtractor;
        return undefined;
      }),
      has: jest.fn((factKey: string) =>
        factKey === 'show_actual_start_time' || factKey === 'show_actual_end_time',
      ),
      registeredFactKeys: jest.fn(() => ['show_actual_start_time', 'show_actual_end_time']),
    } as unknown as ExtractorRegistry;
    const pairedService = new FactExtractionService(
      taskService,
      auditService,
      pairedRegistry,
      processor,
      showPlatformService,
    );
    startExtractor.apply.mockResolvedValue({
      kind: 'write',
      action: 'CREATE',
      oldValue: null,
      newValue: '2026-05-23T12:00:00.000Z',
    });
    endExtractor.apply.mockResolvedValue({ kind: 'noop', reason: 'value_unchanged' });
    taskService.findByUidWithSnapshot.mockResolvedValue(buildTaskWithSnapshot({
      schema: {
        items: [
          { id: 'fld_show_start', system_fact_key: 'show_actual_start_time' },
          { id: 'fld_show_end', system_fact_key: 'show_actual_end_time' },
        ],
      },
      content: {
        fld_show_start: '2026-05-23T12:00:00.000Z',
        fld_show_end: '2026-05-23T13:00:00.000Z',
      },
    }));
    taskService.findActiveTasksForShowExcluding.mockResolvedValue([
      {
        uid: 'task_sibling',
        snapshot: {
          schema: {
            items: [{ id: 'fld_sibling', system_fact_key: 'show_actual_end_time' }],
          },
        },
      },
    ] as never);

    const result = await pairedService.extractFromTask({
      taskId: 99n,
      taskUid: 'task_alpha',
      studioId: 1n,
      showId: 10n,
      showUid: 'sho_10',
      source: 'OPERATOR',
    });

    expect(processor.applyPairedShowActuals).not.toHaveBeenCalled();
    expect(result.entries).toEqual(expect.arrayContaining([
      expect.objectContaining({ factKey: 'show_actual_end_time', outcome: 'skipped_collision' }),
      expect.objectContaining({ factKey: 'show_actual_start_time', outcome: 'written' }),
    ]));
  });

  it('records both paired sides as extractor_error when the atomic processor throws', async () => {
    // The `@Transactional` boundary rolls back both column writes and both
    // audits together, so the service must report `extractor_error` on
    // both sides — neither column changed.
    const startExtractor = buildExtractor({ factKey: 'show_actual_start_time' });
    const endExtractor = buildExtractor({ factKey: 'show_actual_end_time' });
    const pairedRegistry = {
      resolve: jest.fn((factKey: string) => {
        if (factKey === 'show_actual_start_time')
          return startExtractor;
        if (factKey === 'show_actual_end_time')
          return endExtractor;
        return undefined;
      }),
      has: jest.fn((factKey: string) =>
        factKey === 'show_actual_start_time' || factKey === 'show_actual_end_time',
      ),
      registeredFactKeys: jest.fn(() => ['show_actual_start_time', 'show_actual_end_time']),
    } as unknown as ExtractorRegistry;
    processor.applyPairedShowActuals.mockRejectedValue(new Error('paired write failed'));
    const pairedService = new FactExtractionService(
      taskService,
      auditService,
      pairedRegistry,
      processor,
      showPlatformService,
    );
    taskService.findByUidWithSnapshot.mockResolvedValue(buildTaskWithSnapshot({
      schema: {
        items: [
          { id: 'fld_show_start', system_fact_key: 'show_actual_start_time' },
          { id: 'fld_show_end', system_fact_key: 'show_actual_end_time' },
        ],
      },
      content: {
        fld_show_start: '2026-05-23T12:00:00.000Z',
        fld_show_end: '2026-05-23T13:00:00.000Z',
      },
    }));

    const result = await pairedService.extractFromTask({
      taskId: 99n,
      taskUid: 'task_alpha',
      studioId: 1n,
      showId: 10n,
      showUid: 'sho_10',
      source: 'OPERATOR',
    });

    expect(result.entries).toEqual(expect.arrayContaining([
      expect.objectContaining({
        factKey: 'show_actual_start_time',
        outcome: 'noop',
        reason: 'extractor_error',
      }),
      expect.objectContaining({
        factKey: 'show_actual_end_time',
        outcome: 'noop',
        reason: 'extractor_error',
      }),
    ]));
  });

  it('reports a lower-priority skip when the extractor returns one', async () => {
    taskService.findByUidWithSnapshot.mockResolvedValue(buildTaskWithSnapshot());
    extractor.apply.mockResolvedValue({
      kind: 'skip',
      action: 'SKIPPED_LOWER_PRIORITY',
      skippedBy: 'MANAGER',
      attemptedValue: '2026-05-23T18:30:00.000Z',
    });

    const result = await service.extractFromTask({
      taskId: 99n,
      taskUid: 'task_alpha',
      studioId: 1n,
      showId: 10n,
      showUid: 'sho_10',
      source: 'OPERATOR',
    });

    expect(result.entries[0]).toMatchObject({
      outcome: 'skipped_lower_priority',
      auditUid: 'aud_SKIPPED_LOWER_PRIORITY',
    });
  });

  it('routes to the review path when another active task binds the same fact key', async () => {
    taskService.findByUidWithSnapshot.mockResolvedValue(buildTaskWithSnapshot());
    taskService.findActiveTasksForShowExcluding.mockResolvedValue([
      {
        uid: 'task_sibling',
        snapshot: {
          schema: {
            items: [{ id: 'fld_sibling', system_fact_key: 'show_actual_start_time' }],
          },
        },
      },
    ] as never);

    const result = await service.extractFromTask({
      taskId: 99n,
      taskUid: 'task_alpha',
      studioId: 1n,
      showId: 10n,
      showUid: 'sho_10',
      source: 'OPERATOR',
    });

    expect(processor.applyAndAudit).not.toHaveBeenCalled();
    expect(result.entries[0]).toMatchObject({
      outcome: 'skipped_collision',
      auditUid: 'aud_SKIPPED_LOWER_PRIORITY',
      reason: 'cross_task_same_fact_key',
    });
    expect(auditService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'SKIPPED_LOWER_PRIORITY',
        metadata: expect.objectContaining({ collision_reason: 'cross_task_same_fact_key' }),
      }),
    );
  });

  it('treats all non-terminal task statuses as collisions (PENDING/IN_PROGRESS/REVIEW/BLOCKED)', async () => {
    taskService.findByUidWithSnapshot.mockResolvedValue(buildTaskWithSnapshot());

    await service.extractFromTask({
      taskId: 99n,
      taskUid: 'task_alpha',
      studioId: 1n,
      showId: 10n,
      showUid: 'sho_10',
      source: 'OPERATOR',
    });

    expect(taskService.findActiveTasksForShowExcluding).toHaveBeenCalledWith(
      10n,
      99n,
      expect.arrayContaining([
        TaskStatus.PENDING,
        TaskStatus.IN_PROGRESS,
        TaskStatus.REVIEW,
        TaskStatus.BLOCKED,
      ]),
    );
    // Sanity: terminal states must not be in the collision set, otherwise a
    // frozen sibling could spuriously block a new submission.
    const statuses = taskService.findActiveTasksForShowExcluding.mock.calls[0]![2]!;
    expect(statuses).not.toContain(TaskStatus.COMPLETED);
    expect(statuses).not.toContain(TaskStatus.CLOSED);
  });

  it('reports blank fields as noop without writing a collision audit even when a sibling collides', async () => {
    // Blank operator submission for the bound field.
    taskService.findByUidWithSnapshot.mockResolvedValue(
      buildTaskWithSnapshot({
        content: { fld_show_start: '' },
      }),
    );
    // A sibling task does bind the same fact key — but the current submission
    // has nothing to write, so the collision guard must not fire.
    taskService.findActiveTasksForShowExcluding.mockResolvedValue([
      {
        uid: 'task_sibling',
        snapshot: {
          schema: {
            items: [{ id: 'fld_sibling', system_fact_key: 'show_actual_start_time' }],
          },
        },
      },
    ] as never);

    const result = await service.extractFromTask({
      taskId: 99n,
      taskUid: 'task_alpha',
      studioId: 1n,
      showId: 10n,
      showUid: 'sho_10',
      source: 'OPERATOR',
    });

    expect(result.entries[0]).toMatchObject({
      outcome: 'noop',
      reason: 'value_absent',
    });
    expect(auditService.create).not.toHaveBeenCalled();
    expect(processor.applyAndAudit).not.toHaveBeenCalled();
  });

  it('does not emit a collision audit when an unregistered fact key has a colliding sibling', async () => {
    // The current submission carries `show_actual_end_time` (no extractor registered
    // in 12.0.5) — and a sibling active task happens to bind the same key. The
    // registry-silent contract says nothing should land in the audit table for
    // this key because the pipeline can't act on it; an audit row would be a
    // fictional "collision" from the review surface's perspective.
    taskService.findByUidWithSnapshot.mockResolvedValue(
      buildTaskWithSnapshot({
        schema: { items: [{ id: 'fld_end', system_fact_key: 'show_actual_end_time' }] },
        content: { fld_end: '2026-05-23T20:00:00.000Z' },
      }),
    );
    taskService.findActiveTasksForShowExcluding.mockResolvedValue([
      {
        uid: 'task_sibling',
        snapshot: {
          schema: {
            items: [{ id: 'fld_sibling', system_fact_key: 'show_actual_end_time' }],
          },
        },
      },
    ] as never);

    const result = await service.extractFromTask({
      taskId: 99n,
      taskUid: 'task_alpha',
      studioId: 1n,
      showId: 10n,
      showUid: 'sho_10',
      source: 'OPERATOR',
    });

    expect(result.entries[0]).toMatchObject({
      outcome: 'skipped_no_extractor',
      reason: 'extractor_not_registered',
    });
    expect(auditService.create).not.toHaveBeenCalled();
    expect(processor.applyAndAudit).not.toHaveBeenCalled();
  });

  it('marks unregistered fact keys as skipped_no_extractor without writing an audit', async () => {
    taskService.findByUidWithSnapshot.mockResolvedValue(
      buildTaskWithSnapshot({
        schema: { items: [{ id: 'fld_other', system_fact_key: 'show_actual_end_time' }] },
        content: { fld_other: '2026-05-23T20:00:00.000Z' },
      }),
    );

    const result = await service.extractFromTask({
      taskId: 1n,
      taskUid: 'task_alpha',
      studioId: 1n,
      showId: 10n,
      showUid: 'sho_10',
      source: 'OPERATOR',
    });

    expect(result.entries[0]).toMatchObject({
      outcome: 'skipped_no_extractor',
    });
    expect(auditService.create).not.toHaveBeenCalled();
    expect(processor.applyAndAudit).not.toHaveBeenCalled();
  });

  it('treats a processor throw as noop with extractor_error reason so the rollback is observable', async () => {
    taskService.findByUidWithSnapshot.mockResolvedValue(buildTaskWithSnapshot());
    processor.applyAndAudit.mockRejectedValue(new Error('audit insert failed'));

    const result = await service.extractFromTask({
      taskId: 99n,
      taskUid: 'task_alpha',
      studioId: 1n,
      showId: 10n,
      showUid: 'sho_10',
      source: 'OPERATOR',
    });

    expect(result.entries[0]).toMatchObject({
      outcome: 'noop',
      reason: 'extractor_error',
    });
  });

  describe('show platform actuals routing', () => {
    function buildPairedPlatformRegistry(extractors: {
      start: IngestionExtractor;
      end: IngestionExtractor;
    }): ExtractorRegistry {
      return {
        resolve: jest.fn((factKey: string) => {
          if (factKey === 'show_platform_actual_start_time')
            return extractors.start;
          if (factKey === 'show_platform_actual_end_time')
            return extractors.end;
          return undefined;
        }),
        has: jest.fn((factKey: string) =>
          factKey === 'show_platform_actual_start_time'
          || factKey === 'show_platform_actual_end_time',
        ),
        registeredFactKeys: jest.fn(() => [
          'show_platform_actual_start_time',
          'show_platform_actual_end_time',
        ]),
      } as unknown as ExtractorRegistry;
    }

    function buildPlatformTaskSnapshot(targetUids: string[]): ReturnType<typeof buildTaskWithSnapshot> {
      const items = [
        { id: 'fld_platstart1', system_fact_key: 'show_platform_actual_start_time' },
        { id: 'fld_platend123', system_fact_key: 'show_platform_actual_end_time' },
      ];
      const content: Record<string, string> = {};
      for (const uid of targetUids) {
        content[`fld_platstart1:platform:${uid}`] = '2026-05-23T12:00:00.000Z';
        content[`fld_platend123:platform:${uid}`] = '2026-05-23T13:00:00.000Z';
      }
      return buildTaskWithSnapshot({ schema: { items }, content });
    }

    it('routes a paired platform submission through applyPairedShowPlatformActuals once per target', async () => {
      const startExtractor = buildExtractor({ factKey: 'show_platform_actual_start_time' });
      const endExtractor = buildExtractor({ factKey: 'show_platform_actual_end_time' });
      const pairedService = new FactExtractionService(
        taskService,
        auditService,
        buildPairedPlatformRegistry({ start: startExtractor, end: endExtractor }),
        processor,
        showPlatformService,
      );
      taskService.findByUidWithSnapshot.mockResolvedValue(
        buildPlatformTaskSnapshot(['show_plt_200', 'show_plt_201']),
      );
      showPlatformService.findActiveByUids.mockResolvedValue(
        new Map([
          ['show_plt_200', { id: 200n, showId: 10n }],
          ['show_plt_201', { id: 201n, showId: 10n }],
        ]),
      );

      const result = await pairedService.extractFromTask({
        taskId: 99n,
        taskUid: 'task_alpha',
        studioId: 1n,
        showId: 10n,
        showUid: 'sho_10',
        source: 'OPERATOR',
      });

      // One call per platform target, each carrying its own showPlatformUid
      // and the resolved targetIds for the SHOW_PLATFORM audit row.
      expect(processor.applyPairedShowPlatformActuals).toHaveBeenCalledTimes(2);
      const calls = processor.applyPairedShowPlatformActuals.mock.calls;
      const uidsSeen = calls.map((args) => (args[0] as { showPlatformUid: string }).showPlatformUid).sort();
      expect(uidsSeen).toEqual(['show_plt_200', 'show_plt_201']);
      const targetIdsSeen = calls
        .map((args) => (args[0] as { targetIds: { targetId: bigint }[] }).targetIds[0]!.targetId)
        .sort();
      expect(targetIdsSeen).toEqual([200n, 201n]);

      // The per-extractor processor.applyAndAudit must not be invoked for
      // any side — the atomic per-target processor owns the writes.
      expect(processor.applyAndAudit).not.toHaveBeenCalled();
      expect(startExtractor.apply).not.toHaveBeenCalled();
      expect(endExtractor.apply).not.toHaveBeenCalled();
      // Each target emits two entries (start + end), so 4 total.
      expect(result.entries).toHaveLength(4);
    });

    it('emits skipped_stale_target without writing an audit when the platform target is missing from the active map', async () => {
      const startExtractor = buildExtractor({ factKey: 'show_platform_actual_start_time' });
      const endExtractor = buildExtractor({ factKey: 'show_platform_actual_end_time' });
      const pairedService = new FactExtractionService(
        taskService,
        auditService,
        buildPairedPlatformRegistry({ start: startExtractor, end: endExtractor }),
        processor,
        showPlatformService,
      );
      taskService.findByUidWithSnapshot.mockResolvedValue(
        buildPlatformTaskSnapshot(['show_plt_404']),
      );
      // Bulk lookup returns nothing — the target was unassigned between
      // submission and extraction.
      showPlatformService.findActiveByUids.mockResolvedValue(new Map());

      const result = await pairedService.extractFromTask({
        taskId: 99n,
        taskUid: 'task_alpha',
        studioId: 1n,
        showId: 10n,
        showUid: 'sho_10',
        source: 'OPERATOR',
      });

      expect(processor.applyPairedShowPlatformActuals).not.toHaveBeenCalled();
      expect(processor.applyAndAudit).not.toHaveBeenCalled();
      expect(auditService.create).not.toHaveBeenCalled();
      // Both sides for the stale target — no audit, no write.
      expect(result.entries).toEqual(expect.arrayContaining([
        expect.objectContaining({
          factKey: 'show_platform_actual_start_time',
          outcome: 'skipped_stale_target',
        }),
        expect.objectContaining({
          factKey: 'show_platform_actual_end_time',
          outcome: 'skipped_stale_target',
        }),
      ]));
    });

    it('falls back to the per-fact loop when only one paired platform side is present', async () => {
      // One-sided platform updates skip the atomic processor — the per-
      // extractor flow already validates against the stored counterpart.
      const startExtractor = buildExtractor({ factKey: 'show_platform_actual_start_time' });
      const endExtractor = buildExtractor({ factKey: 'show_platform_actual_end_time' });
      startExtractor.apply.mockResolvedValue({
        kind: 'write',
        action: 'CREATE',
        oldValue: null,
        newValue: '2026-05-23T12:00:00.000Z',
      });
      const pairedService = new FactExtractionService(
        taskService,
        auditService,
        buildPairedPlatformRegistry({ start: startExtractor, end: endExtractor }),
        processor,
        showPlatformService,
      );
      taskService.findByUidWithSnapshot.mockResolvedValue(buildTaskWithSnapshot({
        schema: {
          items: [
            { id: 'fld_platstart1', system_fact_key: 'show_platform_actual_start_time' },
          ],
        },
        content: {
          'fld_platstart1:platform:show_plt_200': '2026-05-23T12:00:00.000Z',
        },
      }));
      showPlatformService.findActiveByUids.mockResolvedValue(
        new Map([['show_plt_200', { id: 200n, showId: 10n }]]),
      );

      const result = await pairedService.extractFromTask({
        taskId: 99n,
        taskUid: 'task_alpha',
        studioId: 1n,
        showId: 10n,
        showUid: 'sho_10',
        source: 'OPERATOR',
      });

      expect(processor.applyPairedShowPlatformActuals).not.toHaveBeenCalled();
      expect(processor.applyAndAudit).toHaveBeenCalledTimes(1);
      expect(processor.applyAndAudit).toHaveBeenCalledWith(
        startExtractor,
        expect.objectContaining({ factKey: 'show_platform_actual_start_time' }),
        expect.any(Object),
        [{ targetType: 'SHOW_PLATFORM', targetId: 200n }],
      );
      expect(result.entries[0]).toMatchObject({
        factKey: 'show_platform_actual_start_time',
        outcome: 'written',
      });
    });

    it('records both paired platform sides as extractor_error when the atomic processor throws', async () => {
      // The `@Transactional` boundary rolls back both column writes and both
      // audits together, so the service must report `extractor_error` on
      // both sides — neither column changed.
      const startExtractor = buildExtractor({ factKey: 'show_platform_actual_start_time' });
      const endExtractor = buildExtractor({ factKey: 'show_platform_actual_end_time' });
      processor.applyPairedShowPlatformActuals.mockRejectedValue(new Error('paired platform write failed'));
      const pairedService = new FactExtractionService(
        taskService,
        auditService,
        buildPairedPlatformRegistry({ start: startExtractor, end: endExtractor }),
        processor,
        showPlatformService,
      );
      taskService.findByUidWithSnapshot.mockResolvedValue(
        buildPlatformTaskSnapshot(['show_plt_200']),
      );
      showPlatformService.findActiveByUids.mockResolvedValue(
        new Map([['show_plt_200', { id: 200n, showId: 10n }]]),
      );

      const result = await pairedService.extractFromTask({
        taskId: 99n,
        taskUid: 'task_alpha',
        studioId: 1n,
        showId: 10n,
        showUid: 'sho_10',
        source: 'OPERATOR',
      });

      expect(result.entries).toEqual(expect.arrayContaining([
        expect.objectContaining({
          factKey: 'show_platform_actual_start_time',
          outcome: 'noop',
          reason: 'extractor_error',
        }),
        expect.objectContaining({
          factKey: 'show_platform_actual_end_time',
          outcome: 'noop',
          reason: 'extractor_error',
        }),
      ]));
    });

    it('routes cross-task collisions on a platform fact key through the SKIPPED_LOWER_PRIORITY audit', async () => {
      // Active sibling task binds the same platform fact key — both
      // submissions could race against the same ShowPlatform column. Route
      // to the collision-skip audit so the review surface can resolve it.
      const startExtractor = buildExtractor({ factKey: 'show_platform_actual_start_time' });
      const endExtractor = buildExtractor({ factKey: 'show_platform_actual_end_time' });
      const pairedService = new FactExtractionService(
        taskService,
        auditService,
        buildPairedPlatformRegistry({ start: startExtractor, end: endExtractor }),
        processor,
        showPlatformService,
      );
      taskService.findByUidWithSnapshot.mockResolvedValue(buildTaskWithSnapshot({
        schema: {
          items: [
            { id: 'fld_platstart1', system_fact_key: 'show_platform_actual_start_time' },
          ],
        },
        content: {
          'fld_platstart1:platform:show_plt_200': '2026-05-23T12:00:00.000Z',
        },
      }));
      showPlatformService.findActiveByUids.mockResolvedValue(
        new Map([['show_plt_200', { id: 200n, showId: 10n }]]),
      );
      taskService.findActiveTasksForShowExcluding.mockResolvedValue([
        {
          uid: 'task_sibling',
          snapshot: {
            schema: {
              items: [{ id: 'fld_sibling', system_fact_key: 'show_platform_actual_start_time' }],
            },
          },
        },
      ] as never);

      const result = await pairedService.extractFromTask({
        taskId: 99n,
        taskUid: 'task_alpha',
        studioId: 1n,
        showId: 10n,
        showUid: 'sho_10',
        source: 'OPERATOR',
      });

      expect(processor.applyPairedShowPlatformActuals).not.toHaveBeenCalled();
      expect(processor.applyAndAudit).not.toHaveBeenCalled();
      expect(result.entries[0]).toMatchObject({
        factKey: 'show_platform_actual_start_time',
        outcome: 'skipped_collision',
        reason: 'cross_task_same_fact_key',
      });
      expect(auditService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'SKIPPED_LOWER_PRIORITY',
          targets: [{ targetType: 'SHOW_PLATFORM', targetId: 200n }],
          metadata: expect.objectContaining({
            collision_reason: 'cross_task_same_fact_key',
            fact_key: 'show_platform_actual_start_time',
          }),
        }),
      );
    });
  });
});
