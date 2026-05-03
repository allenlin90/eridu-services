import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';

import {
  getTaskReportSourcesQuerySchema,
  taskReportPreflightRequestSchema,
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

  it('uses local day boundaries for explicit date_from/date_to scope', async () => {
    repository.countShowsInScope.mockResolvedValue(1);
    repository.countSubmittedTasksInScope.mockResolvedValue(2);

    await service.preflight(
      'std_123',
      taskReportPreflightRequestSchema.parse({
        scope: {
          date_from: '2026-03-10',
          date_to: '2026-03-11',
          submitted_statuses: ['REVIEW', 'COMPLETED', 'CLOSED'],
        },
      }),
    );

    const callArgs = repository.countShowsInScope.mock.calls[0]?.[1];
    expect(callArgs?.dateFrom?.getFullYear()).toBe(2026);
    expect(callArgs?.dateFrom?.getMonth()).toBe(2);
    expect(callArgs?.dateFrom?.getDate()).toBe(10);
    expect(callArgs?.dateFrom?.getHours()).toBe(0);
    expect(callArgs?.dateTo?.getFullYear()).toBe(2026);
    expect(callArgs?.dateTo?.getMonth()).toBe(2);
    expect(callArgs?.dateTo?.getDate()).toBe(11);
    expect(callArgs?.dateTo?.getHours()).toBe(23);
    expect(callArgs?.dateTo?.getMinutes()).toBe(59);
  });

  it('throws when date range is missing in scope resolution', () => {
    expect(() => service.resolveScopeFilters({
      submitted_statuses: ['REVIEW', 'COMPLETED', 'CLOSED'],
    } as any)).toThrow('date_from and date_to are required');
  });
});
