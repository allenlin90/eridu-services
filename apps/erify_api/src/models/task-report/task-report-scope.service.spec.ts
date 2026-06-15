import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';

import {
  getTaskReportSourcesQuerySchema,
  taskReportExecutionScopeSchema,
  taskReportPreflightRequestSchema,
  taskReportScopeSchema,
  TemplateSchemaValidator,
} from '@eridu/api-types/task-management';

import { TaskReportScopeRepository } from './task-report-scope.repository';
import { TaskReportScopeService } from './task-report-scope.service';

import { StudioService } from '@/models/studio/studio.service';

describe('taskReportScopeService', () => {
  const defaultScope = {
    date_from: '2026-03-01',
    date_to: '2026-03-31',
    show_standard_id: ['shsd_1'],
    // Client-resolved operational-day window (06:00 -> 05:59 next day).
    window_start: '2026-03-01T06:00:00.000Z',
    window_end: '2026-04-01T05:59:59.999Z',
  };

  let service: TaskReportScopeService;
  let repository: jest.Mocked<TaskReportScopeRepository>;
  let studioService: jest.Mocked<StudioService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TaskReportScopeService,
        {
          provide: TaskReportScopeRepository,
          useValue: {
            countShowsInScope: jest.fn(),
            countSubmittedTasksInScope: jest.fn(),
            findSourceSnapshotsInScope: jest.fn(),
          },
        },
        {
          provide: StudioService,
          useValue: {
            getSharedFields: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(TaskReportScopeService);
    repository = module.get(TaskReportScopeRepository);
    studioService = module.get(StudioService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('returns contextual sources with shared_fields deduplicated from discovered standard keys', async () => {
    const snapshotSchema = TemplateSchemaValidator.parse({
      items: [
        {
          id: 'fi_1',
          key: 'gmv',
          type: 'number',
          standard: true,
          label: 'GMV',
        },
        {
          id: 'fi_2',
          key: 'notes',
          type: 'text',
          label: 'Notes',
        },
      ],
      metadata: { task_type: 'CLOSURE' },
    });

    repository.findSourceSnapshotsInScope.mockResolvedValue([
      {
        templateUid: 'ttpl_a',
        templateName: 'Template A',
        snapshotVersion: 1,
        snapshotSchema,
        taskCount: 3,
      },
    ]);
    studioService.getSharedFields.mockResolvedValue([
      {
        key: 'gmv',
        type: 'number',
        category: 'metric',
        label: 'GMV',
        is_active: true,
      },
      {
        key: 'views',
        type: 'number',
        category: 'metric',
        label: 'Views',
        is_active: true,
      },
    ]);

    const result = await service.getSources(
      'std_123',
      getTaskReportSourcesQuerySchema.parse({
        ...defaultScope,
        show_standard_id: 'shsd_1',
      }),
    );

    expect(result.sources).toHaveLength(1);
    expect(result.sources[0]).toEqual({
      template_id: 'ttpl_a',
      template_name: 'Template A',
      task_type: 'CLOSURE',
      submitted_task_count: 3,
      fields: [
        {
          key: 'gmv',
          field_key: 'gmv',
          label: 'GMV',
          type: 'number',
          standard: true,
          category: 'metric',
          source_template_id: 'ttpl_a',
          source_template_name: 'Template A',
          group: undefined,
          shared_field_key: 'gmv',
        },
        {
          key: 'ttpl_a:notes',
          field_key: 'notes',
          label: 'Notes',
          type: 'text',
          source_template_id: 'ttpl_a',
          source_template_name: 'Template A',
          group: undefined,
          shared_field_key: undefined,
          category: undefined,
          standard: undefined,
        },
      ],
    });
    expect(result.shared_fields.map((field) => field.key)).toEqual(['gmv']);
  });

  it('aggregates submitted_task_count across multiple snapshots of the same template without duplicating fields', async () => {
    const schemaV1 = TemplateSchemaValidator.parse({
      items: [
        { id: 'fi_1', key: 'gmv', type: 'number', standard: true, label: 'GMV' },
        { id: 'fi_2', key: 'notes', type: 'text', label: 'Notes' },
      ],
      metadata: { task_type: 'CLOSURE' },
    });
    const schemaV2 = TemplateSchemaValidator.parse({
      items: [
        { id: 'fi_1', key: 'gmv', type: 'number', standard: true, label: 'GMV' },
        { id: 'fi_2', key: 'notes', type: 'text', label: 'Notes' },
        { id: 'fi_3', key: 'rating', type: 'number', label: 'Rating' },
      ],
      metadata: { task_type: 'CLOSURE' },
    });

    repository.findSourceSnapshotsInScope.mockResolvedValue([
      { templateUid: 'ttpl_a', templateName: 'Template A', snapshotVersion: 1, snapshotSchema: schemaV1, taskCount: 4 },
      { templateUid: 'ttpl_a', templateName: 'Template A', snapshotVersion: 2, snapshotSchema: schemaV2, taskCount: 6 },
    ]);
    studioService.getSharedFields.mockResolvedValue([]);

    const result = await service.getSources(
      'std_123',
      getTaskReportSourcesQuerySchema.parse({ ...defaultScope, show_standard_id: 'shsd_1' }),
    );

    expect(result.sources).toHaveLength(1);
    expect(result.sources[0]?.submitted_task_count).toBe(10); // 4 + 6
    // fields from v1 are kept; 'rating' from v2 is added; 'gmv'/'notes' not duplicated
    expect(result.sources[0]?.fields.map((f) => f.key)).toEqual(['gmv', 'ttpl_a:notes', 'ttpl_a:rating']);
    expect(result.sources[0]?.fields.map((f) => f.field_key)).toEqual(['gmv', 'notes', 'rating']);
  });

  it('throws when discovered snapshot schema is invalid', async () => {
    repository.findSourceSnapshotsInScope.mockResolvedValue([
      {
        templateUid: 'ttpl_a',
        templateName: 'Template A',
        snapshotVersion: 1,
        snapshotSchema: { items: [{ key: 'gmv' }] },
        taskCount: 1,
      },
    ]);
    studioService.getSharedFields.mockResolvedValue([]);

    await expect(
      service.getSources(
        'std_123',
        getTaskReportSourcesQuerySchema.parse({
          ...defaultScope,
          show_standard_id: 'shsd_1',
        }),
      ),
    ).rejects.toThrow('Task template snapshot schema is invalid');
  });

  it('falls back to canonical base for v1 historical sources after the legacy registry cleanup', async () => {
    // v1 snapshot referencing legacy suffixed key `gmv_l1` (the registry no
    // longer contains `gmv_l1` after cleanup; only canonical `gmv` remains).
    const v1Schema = TemplateSchemaValidator.parse({
      items: [
        { id: 'fi_1', key: 'gmv_l1', type: 'number', standard: true, label: 'GMV (Loop 1)', group: 'l1' },
      ],
      metadata: { task_type: 'ACTIVE', loops: [{ id: 'l1', name: 'Loop 1', durationMin: 15 }] },
    });

    repository.findSourceSnapshotsInScope.mockResolvedValue([
      { templateUid: 'ttpl_a', templateName: 'Template A', snapshotVersion: 1, snapshotSchema: v1Schema, taskCount: 4 },
    ]);
    studioService.getSharedFields.mockResolvedValue([
      { key: 'gmv', type: 'number', category: 'metric', label: 'GMV', is_active: true },
    ]);

    const result = await service.getSources(
      'std_123',
      getTaskReportSourcesQuerySchema.parse({ ...defaultScope, show_standard_id: 'shsd_1' }),
    );

    expect(result.sources[0]?.fields).toEqual([
      expect.objectContaining({
        key: 'gmv_l1',
        // The resolved shared key is the canonical base; the column key
        // remains `gmv_l1` (descriptor) so saved report defs keep working.
        shared_field_key: 'gmv',
        category: 'metric',
      }),
    ]);
    // Canonical entry surfaces in the picker even though only legacy v1
    // snapshots are in scope.
    expect(result.shared_fields.map((f) => f.key)).toEqual(['gmv']);
  });

  it('aligns column keys for v1 historical and v2 canonical snapshots of the same template', async () => {
    // v1 snapshot of template A (historical task pinning).
    const v1Schema = TemplateSchemaValidator.parse({
      items: [
        { id: 'fi_v1_1', key: 'gmv_l1', type: 'number', standard: true, label: 'GMV (Loop 1)', group: 'l1' },
        { id: 'fi_v1_2', key: 'gmv_l2', type: 'number', standard: true, label: 'GMV (Loop 2)', group: 'l2' },
      ],
      metadata: {
        task_type: 'ACTIVE',
        loops: [
          { id: 'l1', name: 'Loop 1', durationMin: 15 },
          { id: 'l2', name: 'Loop 2', durationMin: 15 },
        ],
      },
    });
    // v2 snapshot of the SAME template after migration: canonical
    // shared_field_key + group, fld_ ids.
    const v2Schema = {
      schema_version: 2,
      schema_engine: 'task_template_v2',
      content_key_strategy: 'field_id',
      report_projection_strategy: 'descriptor',
      items: [
        { id: 'fld_canon11111', key: 'gmv', type: 'number', shared_field_key: 'gmv', label: 'GMV', required: true, group: 'l1' },
        { id: 'fld_canon22222', key: 'gmv', type: 'number', shared_field_key: 'gmv', label: 'GMV', required: true, group: 'l2' },
      ],
      metadata: {
        task_type: 'ACTIVE',
        loops: [
          { id: 'l1', name: 'Loop 1', durationMin: 15 },
          { id: 'l2', name: 'Loop 2', durationMin: 15 },
        ],
      },
    };

    repository.findSourceSnapshotsInScope.mockResolvedValue([
      // Same templateUid, both snapshot versions in scope (mixed v1+v2 tasks).
      { templateUid: 'ttpl_a', templateName: 'Template A', snapshotVersion: 1, snapshotSchema: v1Schema, taskCount: 4 },
      { templateUid: 'ttpl_a', templateName: 'Template A', snapshotVersion: 2, snapshotSchema: v2Schema, taskCount: 2 },
    ]);
    studioService.getSharedFields.mockResolvedValue([
      { key: 'gmv', type: 'number', category: 'metric', label: 'GMV', is_active: true },
    ]);

    const result = await service.getSources(
      'std_123',
      getTaskReportSourcesQuerySchema.parse({ ...defaultScope, show_standard_id: 'shsd_1' }),
    );

    expect(result.sources).toHaveLength(1);
    expect(result.sources[0]?.submitted_task_count).toBe(6);
    // Column keys are descriptor-derived: `gmv_l1`/`gmv_l2` from BOTH engines.
    // Latest snapshot (v2) wins on field metadata, but the column key contract
    // is the same — so v1 and v2 tasks aggregate into the same report rows.
    const fieldKeys = result.sources[0]?.fields.map((f) => f.key).sort();
    expect(fieldKeys).toEqual(['gmv_l1', 'gmv_l2']);
    for (const f of result.sources[0]?.fields ?? []) {
      expect(f.shared_field_key).toBe('gmv');
      expect(f.category).toBe('metric');
    }
  });

  it('returns preflight counts and within_limit true when task count is under default limit', async () => {
    repository.countShowsInScope.mockResolvedValue(5);
    repository.countSubmittedTasksInScope.mockResolvedValue(9999);

    const result = await service.preflight('std_123', {
      scope: {
        ...defaultScope,
        show_ids: ['show_1'],
        submitted_statuses: ['REVIEW', 'COMPLETED', 'CLOSED'],
      },
    });

    expect(result).toEqual({
      show_count: 5,
      task_count: 9999,
      within_limit: true,
      limit: 10000,
    });
  });

  it('applies deterministic latest-snapshot precedence when deduplicating fields by key', async () => {
    const schemaV1 = TemplateSchemaValidator.parse({
      items: [
        { id: 'fi_1', key: 'gmv', type: 'number', label: 'Legacy GMV' },
      ],
      metadata: { task_type: 'LEGACY' },
    });
    const schemaV2 = TemplateSchemaValidator.parse({
      items: [
        { id: 'fi_1', key: 'gmv', type: 'number', standard: true, label: 'GMV' },
      ],
      metadata: { task_type: 'CLOSURE' },
    });

    repository.findSourceSnapshotsInScope.mockResolvedValue([
      // Intentionally provide older snapshot first; service should still prefer v2.
      { templateUid: 'ttpl_a', templateName: 'Template A', snapshotVersion: 1, snapshotSchema: schemaV1, taskCount: 3 },
      { templateUid: 'ttpl_a', templateName: 'Template A', snapshotVersion: 2, snapshotSchema: schemaV2, taskCount: 2 },
    ]);
    studioService.getSharedFields.mockResolvedValue([
      {
        key: 'gmv',
        type: 'number',
        category: 'metric',
        label: 'GMV',
        is_active: true,
      },
    ]);

    const result = await service.getSources(
      'std_123',
      getTaskReportSourcesQuerySchema.parse({ ...defaultScope, show_standard_id: 'shsd_1' }),
    );

    expect(result.sources[0]?.task_type).toBe('CLOSURE');
    expect(result.sources[0]?.fields).toEqual([
      expect.objectContaining({
        key: 'gmv',
        standard: true,
        category: 'metric',
      }),
      expect.objectContaining({
        key: 'ttpl_a:gmv',
        label: 'Legacy GMV',
      }),
    ]);
  });

  it('returns within_limit false when task count exceeds default limit', async () => {
    repository.countShowsInScope.mockResolvedValue(5);
    repository.countSubmittedTasksInScope.mockResolvedValue(10001);

    const result = await service.preflight('std_123', {
      scope: {
        ...defaultScope,
        show_type_id: ['sht_1'],
        submitted_statuses: ['REVIEW', 'COMPLETED', 'CLOSED'],
      },
    });

    expect(result.within_limit).toBe(false);
    expect(result.limit).toBe(10000);
  });

  it('returns within_limit false when show count exceeds default limit', async () => {
    repository.countShowsInScope.mockResolvedValue(10001);
    repository.countSubmittedTasksInScope.mockResolvedValue(2);

    const result = await service.preflight('std_123', {
      scope: {
        ...defaultScope,
        submitted_statuses: ['REVIEW', 'COMPLETED', 'CLOSED'],
      },
    });

    expect(result).toEqual({
      show_count: 10001,
      task_count: 2,
      within_limit: false,
      limit: 10000,
    });
  });

  it('passes multi-selected client_id values to repository scope filters', async () => {
    repository.countShowsInScope.mockResolvedValue(1);
    repository.countSubmittedTasksInScope.mockResolvedValue(2);

    await service.preflight(
      'std_123',
      taskReportPreflightRequestSchema.parse({
        scope: {
          ...defaultScope,
          client_id: ['client_1', 'client_2'],
          submitted_statuses: ['REVIEW', 'COMPLETED', 'CLOSED'],
        },
      }),
    );

    const callArgs = repository.countShowsInScope.mock.calls[0]?.[1];
    expect(callArgs?.clientIds).toEqual(['client_1', 'client_2']);
  });

  it('forwards the client-resolved operational-day window verbatim (no server-side tz math)', async () => {
    repository.countShowsInScope.mockResolvedValue(1);
    repository.countSubmittedTasksInScope.mockResolvedValue(2);

    // FE sends the operational-day window (06:00 -> 05:59 next day) as ISO instants.
    const windowStart = '2026-03-10T06:00:00.000Z';
    const windowEnd = '2026-03-12T05:59:59.999Z';

    await service.preflight(
      'std_123',
      taskReportPreflightRequestSchema.parse({
        scope: {
          date_from: '2026-03-10',
          date_to: '2026-03-11',
          submitted_statuses: ['REVIEW', 'COMPLETED', 'CLOSED'],
          window_start: windowStart,
          window_end: windowEnd,
        },
      }),
    );

    const callArgs = repository.countShowsInScope.mock.calls[0]?.[1];
    expect(callArgs?.dateFrom?.toISOString()).toBe(windowStart);
    expect(callArgs?.dateTo?.toISOString()).toBe(windowEnd);
  });

  it('enforces a bounded date range and a client window at the schema boundary', () => {
    // Date range is required by the shared scope refinement.
    expect(() => taskReportScopeSchema.parse({
      submitted_statuses: ['REVIEW', 'COMPLETED', 'CLOSED'],
    })).toThrow('date_from and date_to are required');

    // Execution additionally requires the client-resolved operational-day window.
    expect(() => taskReportExecutionScopeSchema.parse({
      date_from: '2026-03-10',
      date_to: '2026-03-11',
      submitted_statuses: ['REVIEW', 'COMPLETED', 'CLOSED'],
    })).toThrow('window_start');
  });
});
