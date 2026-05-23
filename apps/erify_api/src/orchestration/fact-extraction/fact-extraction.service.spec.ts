import { TaskStatus } from '@prisma/client';

import type { IngestionExtractor } from './extractors/extractor.types';
import type { ExtractorRegistry } from './extractors/extractor-registry';
import type { FactExtractionProcessor, ProcessedFact } from './fact-extraction.processor';
import { FactExtractionService } from './fact-extraction.service';

import type { AuditService } from '@/models/audit/audit.service';
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
    } as never;
    service = new FactExtractionService(taskService, auditService, registry, processor);
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
});
