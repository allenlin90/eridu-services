import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { Prisma } from '@prisma/client';

import {
  taskReportRunRequestSchema,
  TemplateSchemaV2Validator,
  TemplateSchemaValidator,
} from '@eridu/api-types/task-management';

import { TaskReportRunService } from './task-report-run.service';
import { TaskReportScopeRepository } from './task-report-scope.repository';
import { TaskReportScopeService } from './task-report-scope.service';

import { StudioService } from '@/models/studio/studio.service';

describe('taskReportRunService', () => {
  const defaultReportScope = {
    date_from: '2026-03-01',
    date_to: '2026-03-31',
    show_standard_id: 'shsd_1',
    // Client-resolved operational-day window (06:00 -> 05:59 next day).
    window_start: '2026-03-01T06:00:00.000Z',
    window_end: '2026-04-01T05:59:59.999Z',
  } as const;
  const createScopedShow = (overrides: Record<string, unknown> = {}) => ({
    uid: 'show_1',
    name: 'Show 1',
    externalId: 'EXT-1',
    startTime: new Date('2026-03-16T00:00:00.000Z'),
    endTime: new Date('2026-03-16T02:00:00.000Z'),
    actualStartTime: null,
    actualEndTime: null,
    clientUid: 'client_1',
    clientName: 'Client A',
    studioRoomUid: 'room_1',
    studioRoomName: 'Room A',
    showStatusUid: 'shst_1',
    showStatusName: 'Confirmed',
    showStandardName: 'Standard A',
    showTypeName: 'Type A',
    showPlatforms: [],
    ...overrides,
  });
  const viewCountMetadata = { performance_templates: { show_platform_view_count: 'ttpl_1' } };
  const createScopedTask = (overrides: Record<string, unknown> = {}) => ({
    uid: 'task_1',
    updatedAt: new Date('2026-03-17T10:00:00.000Z'),
    templateUid: 'ttpl_1',
    templateName: 'Template 1',
    snapshotId: 'snap_1',
    snapshotSchema: {},
    content: {},
    targetShowUids: ['show_1'],
    assigneeUid: null,
    assigneeName: null,
    ...overrides,
  });

  let service: TaskReportRunService;
  let scopeService: jest.Mocked<TaskReportScopeService>;
  let scopeRepository: jest.Mocked<TaskReportScopeRepository>;
  let studioService: jest.Mocked<StudioService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TaskReportRunService,
        {
          provide: TaskReportScopeService,
          useValue: {
            preflight: jest.fn(),
            resolveScopeFilters: jest.fn(),
          },
        },
        {
          provide: TaskReportScopeRepository,
          useValue: {
            findShowsInScope: jest.fn(),
            findSubmittedTasksInScope: jest.fn(),
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

    service = module.get(TaskReportRunService);
    scopeService = module.get(TaskReportScopeService);
    scopeRepository = module.get(TaskReportScopeRepository);
    studioService = module.get(StudioService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('builds one row per show and applies latest-wins merge for duplicate sources', async () => {
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

    scopeService.preflight.mockResolvedValue({
      show_count: 2,
      task_count: 3,
      within_limit: true,
      limit: 10000,
    });
    scopeService.resolveScopeFilters.mockReturnValue({
      showStandardId: 'shsd_1',
      submittedStatuses: ['REVIEW', 'COMPLETED', 'CLOSED'],
    } as any);
    scopeRepository.findShowsInScope.mockResolvedValue([
      createScopedShow(),
      createScopedShow({
        uid: 'show_2',
        name: 'Show 2',
        externalId: 'EXT-2',
        startTime: new Date('2026-03-15T00:00:00.000Z'),
        endTime: new Date('2026-03-15T02:00:00.000Z'),
        clientUid: 'client_2',
        clientName: 'Client B',
        studioRoomUid: 'room_2',
        studioRoomName: 'Room B',
      }),
    ]);
    scopeRepository.findSubmittedTasksInScope.mockResolvedValue([
      createScopedTask({
        uid: 'task_new',
        snapshotSchema,
        content: { gmv: 200, notes: 'new notes' },
        targetShowUids: ['show_1'],
        assigneeUid: 'user_1',
        assigneeName: 'Alice',
      }),
      createScopedTask({
        uid: 'task_old',
        updatedAt: new Date('2026-03-16T10:00:00.000Z'),
        snapshotSchema,
        content: { gmv: 100, notes: 'old notes' },
        targetShowUids: ['show_1'],
        assigneeUid: 'user_1',
        assigneeName: 'Alice',
      }),
      createScopedTask({
        uid: 'task_show2',
        templateUid: 'ttpl_2',
        templateName: 'Template 2',
        snapshotId: 'snap_2',
        snapshotSchema,
        content: { gmv: 300 },
        targetShowUids: ['show_2'],
        assigneeUid: 'user_2',
        assigneeName: 'Bob',
      }),
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

    const result = await service.run('std_123', taskReportRunRequestSchema.parse({
      scope: defaultReportScope,
      columns: [
        { key: 'gmv', label: 'GMV' },
        { key: 'ttpl_1:notes', label: 'Notes' },
      ],
    }));

    expect(result.row_count).toBe(2);
    expect(result.rows[0]).toMatchObject({
      'gmv': 200,
      'ttpl_1:notes': 'new notes',
      'show_status_name': 'Confirmed',
      'assignee_name': 'Alice',
    });
    expect(result.rows[1]).toMatchObject({
      'gmv': 300,
      'ttpl_1:notes': null,
      'show_status_name': 'Confirmed',
      'assignee_name': 'Bob',
    });
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]).toMatchObject({
      code: 'DUPLICATE_SOURCE',
      show_id: 'show_1',
      template_id: 'ttpl_1',
    });
    expect(result.column_map).toEqual({
      'gmv': null,
      'ttpl_1:notes': 'ttpl_1',
    });
  });

  it('renders a submitted-but-blank numeric field as not-reported (null), not 0 (WI-34/D9)', async () => {
    const snapshotSchema = TemplateSchemaValidator.parse({
      items: [
        {
          id: 'fi_1',
          key: 'gmv',
          type: 'number',
          standard: true,
          label: 'GMV',
        },
      ],
      metadata: { task_type: 'CLOSURE' },
    });

    scopeService.preflight.mockResolvedValue({
      show_count: 1,
      task_count: 1,
      within_limit: true,
      limit: 10000,
    });
    scopeService.resolveScopeFilters.mockReturnValue({
      showStandardId: 'shsd_1',
      submittedStatuses: ['REVIEW', 'COMPLETED', 'CLOSED'],
    } as any);
    scopeRepository.findShowsInScope.mockResolvedValue([createScopedShow()]);
    scopeRepository.findSubmittedTasksInScope.mockResolvedValue([
      createScopedTask({
        snapshotSchema,
        content: { gmv: '   ' },
      }),
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

    const result = await service.run('std_123', taskReportRunRequestSchema.parse({
      scope: defaultReportScope,
      columns: [{ key: 'gmv', label: 'GMV' }],
    }));

    expect(result.row_count).toBe(1);
    expect(result.rows[0].gmv).toBeNull();
  });

  it('emits sidecar explanations and extra input data in an adjacent column when selected', async () => {
    const snapshotSchema = TemplateSchemaValidator.parse({
      items: [
        {
          id: 'fld_live_title',
          key: 'live_title',
          type: 'select',
          label: 'Live title',
          options: [
            { value: 'correct', label: 'Correct' },
            { value: 'not_correct', label: 'Not correct' },
          ],
          validation: {
            require_reason: [{ op: 'neq', value: 'correct' }],
          },
        },
      ],
      metadata: {},
    });

    scopeService.preflight.mockResolvedValue({
      show_count: 1,
      task_count: 1,
      within_limit: true,
      limit: 10000,
    });
    scopeService.resolveScopeFilters.mockReturnValue({
      showStandardId: 'shsd_1',
      submittedStatuses: ['REVIEW', 'COMPLETED', 'CLOSED'],
    } as any);
    scopeRepository.findShowsInScope.mockResolvedValue([
      createScopedShow(),
    ]);
    scopeRepository.findSubmittedTasksInScope.mockResolvedValue([
      createScopedTask({
        snapshotSchema,
        content: {
          live_title: 'not_correct',
          live_title__reason: 'Title does not match the approved run sheet.',
          live_title__extra: {
            cause: 'OBS scene was stale',
            reported_by: 'Operator A',
          },
        },
      }),
    ]);
    studioService.getSharedFields.mockResolvedValue([]);

    const result = await service.run('std_123', taskReportRunRequestSchema.parse({
      scope: defaultReportScope,
      columns: [{ key: 'ttpl_1:live_title', label: 'Live title', include_extra: true }],
    }));

    expect(result.rows[0]).toMatchObject({
      'ttpl_1:live_title': 'not_correct',
      'ttpl_1:live_title__extra': [
        'Explanation: Title does not match the approved run sheet.',
        'Cause: OBS scene was stale',
        'Reported By: Operator A',
      ].join('\n'),
    });
    expect(result.columns.map((column) => column.key)).toEqual([
      'ttpl_1:live_title',
      'ttpl_1:live_title__extra',
    ]);
    expect(result.columns[1]).toMatchObject({
      label: 'Live title Extra',
      type: 'textarea',
      source_template_id: 'ttpl_1',
    });
  });

  it('does not export sidecar explanations unless selected column opts in', async () => {
    const snapshotSchema = TemplateSchemaValidator.parse({
      items: [
        {
          id: 'fld_live_title',
          key: 'live_title',
          type: 'select',
          label: 'Live title',
          options: [
            { value: 'correct', label: 'Correct' },
            { value: 'not_correct', label: 'Not correct' },
          ],
          validation: {
            require_reason: [{ op: 'neq', value: 'correct' }],
          },
        },
      ],
      metadata: {},
    });

    scopeService.preflight.mockResolvedValue({
      show_count: 1,
      task_count: 1,
      within_limit: true,
      limit: 10000,
    });
    scopeService.resolveScopeFilters.mockReturnValue({
      showStandardId: 'shsd_1',
      submittedStatuses: ['REVIEW', 'COMPLETED', 'CLOSED'],
    } as any);
    scopeRepository.findShowsInScope.mockResolvedValue([
      createScopedShow(),
    ]);
    scopeRepository.findSubmittedTasksInScope.mockResolvedValue([
      createScopedTask({
        snapshotSchema,
        content: {
          live_title: 'not_correct',
          live_title__reason: 'Title does not match the approved run sheet.',
          live_title__extra: {
            cause: 'OBS scene was stale',
          },
        },
      }),
    ]);
    studioService.getSharedFields.mockResolvedValue([]);

    const result = await service.run('std_123', taskReportRunRequestSchema.parse({
      scope: defaultReportScope,
      columns: [{ key: 'ttpl_1:live_title', label: 'Live title' }],
    }));

    expect(result.rows[0]).toMatchObject({
      'ttpl_1:live_title': 'not_correct',
    });
    expect(result.rows[0]).not.toHaveProperty('ttpl_1:live_title__extra');
    expect(result.columns.map((column) => column.key)).toEqual(['ttpl_1:live_title']);
  });

  it('rejects unknown column key with compatibility details', async () => {
    const snapshotSchema = TemplateSchemaValidator.parse({
      items: [
        {
          id: 'fi_1',
          key: 'gmv',
          type: 'number',
          standard: true,
          label: 'GMV',
        },
      ],
      metadata: {},
    });

    scopeService.preflight.mockResolvedValue({
      show_count: 1,
      task_count: 1,
      within_limit: true,
      limit: 10000,
    });
    scopeService.resolveScopeFilters.mockReturnValue({
      showStandardId: 'shsd_1',
      submittedStatuses: ['REVIEW', 'COMPLETED', 'CLOSED'],
    } as any);
    scopeRepository.findShowsInScope.mockResolvedValue([
      createScopedShow(),
    ]);
    scopeRepository.findSubmittedTasksInScope.mockResolvedValue([
      createScopedTask({
        snapshotSchema,
        content: { gmv: 200 },
      }),
    ]);
    studioService.getSharedFields.mockResolvedValue([]);

    await expect(
      service.run('std_123', taskReportRunRequestSchema.parse({
        scope: defaultReportScope,
        columns: [{ key: 'unknown_key', label: 'Unknown' }],
      })),
    ).rejects.toMatchObject({
      response: expect.objectContaining({
        message: 'Selected columns are incompatible with the current scope',
        details: {
          incompatible_columns: [
            expect.objectContaining({
              key: 'unknown_key',
              label: 'Unknown',
              reason: 'unknown_column_key',
            }),
          ],
        },
      }),
    });
  });

  it('rejects template-scoped columns absent from current scope', async () => {
    const snapshotSchema = TemplateSchemaValidator.parse({
      items: [
        {
          id: 'fi_1',
          key: 'gmv',
          type: 'number',
          standard: true,
          label: 'GMV',
        },
      ],
      metadata: {},
    });

    scopeService.preflight.mockResolvedValue({
      show_count: 1,
      task_count: 1,
      within_limit: true,
      limit: 10000,
    });
    scopeService.resolveScopeFilters.mockReturnValue({
      showStandardId: 'shsd_1',
      submittedStatuses: ['REVIEW', 'COMPLETED', 'CLOSED'],
    } as any);
    scopeRepository.findShowsInScope.mockResolvedValue([
      createScopedShow(),
    ]);
    scopeRepository.findSubmittedTasksInScope.mockResolvedValue([
      createScopedTask({
        snapshotSchema,
        content: { gmv: 200 },
      }),
    ]);
    studioService.getSharedFields.mockResolvedValue([]);

    await expect(
      service.run('std_123', taskReportRunRequestSchema.parse({
        scope: defaultReportScope,
        columns: [{ key: 'ttpl_2:notes', label: 'Notes' }],
      })),
    ).rejects.toMatchObject({
      response: expect.objectContaining({
        message: 'Selected columns are incompatible with the current scope',
        details: {
          incompatible_columns: [
            expect.objectContaining({
              key: 'ttpl_2:notes',
              label: 'Notes',
              reason: 'template_field_not_in_scope',
            }),
          ],
        },
      }),
    });
  });

  it('rejects shared fields absent from current scope', async () => {
    const snapshotSchema = TemplateSchemaValidator.parse({
      items: [
        {
          id: 'fi_1',
          key: 'notes',
          type: 'text',
          label: 'Notes',
        },
      ],
      metadata: {},
    });

    scopeService.preflight.mockResolvedValue({
      show_count: 1,
      task_count: 1,
      within_limit: true,
      limit: 10000,
    });
    scopeService.resolveScopeFilters.mockReturnValue({
      showStandardId: 'shsd_1',
      submittedStatuses: ['REVIEW', 'COMPLETED', 'CLOSED'],
    } as any);
    scopeRepository.findShowsInScope.mockResolvedValue([
      createScopedShow(),
    ]);
    scopeRepository.findSubmittedTasksInScope.mockResolvedValue([
      createScopedTask({
        snapshotSchema,
        content: { notes: 'hello' },
      }),
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

    await expect(
      service.run('std_123', taskReportRunRequestSchema.parse({
        scope: defaultReportScope,
        columns: [{ key: 'gmv', label: 'GMV' }],
      })),
    ).rejects.toMatchObject({
      response: expect.objectContaining({
        message: 'Selected columns are incompatible with the current scope',
        details: {
          incompatible_columns: [
            expect.objectContaining({
              key: 'gmv',
              label: 'GMV',
              reason: 'shared_field_not_in_scope',
            }),
          ],
        },
      }),
    });
  });

  it('rejects run when preflight exceeds row limit', async () => {
    scopeService.preflight.mockResolvedValue({
      show_count: 300,
      task_count: 10001,
      within_limit: false,
      limit: 10000,
    });

    await expect(
      service.run('std_123', taskReportRunRequestSchema.parse({
        scope: defaultReportScope,
        columns: [{ key: 'gmv', label: 'GMV' }],
      })),
    ).rejects.toThrow('Scope includes 10001 tasks (limit: 10000). Narrow your scope filters.');

    expect(scopeService.resolveScopeFilters).not.toHaveBeenCalled();
    expect(scopeRepository.findShowsInScope).not.toHaveBeenCalled();
    expect(scopeRepository.findSubmittedTasksInScope).not.toHaveBeenCalled();
  });

  it('rejects run when preflight exceeds show limit', async () => {
    scopeService.preflight.mockResolvedValue({
      show_count: 10001,
      task_count: 5,
      within_limit: false,
      limit: 10000,
    });

    await expect(
      service.run('std_123', taskReportRunRequestSchema.parse({
        scope: defaultReportScope,
        columns: [{ key: 'gmv', label: 'GMV' }],
      })),
    ).rejects.toThrow('Scope includes 10001 shows (limit: 10000). Narrow your scope filters.');

    expect(scopeService.resolveScopeFilters).not.toHaveBeenCalled();
    expect(scopeRepository.findShowsInScope).not.toHaveBeenCalled();
    expect(scopeRepository.findSubmittedTasksInScope).not.toHaveBeenCalled();
  });

  it('rejects run when task snapshot schema is invalid', async () => {
    scopeService.preflight.mockResolvedValue({
      show_count: 1,
      task_count: 1,
      within_limit: true,
      limit: 10000,
    });
    scopeService.resolveScopeFilters.mockReturnValue({
      showStandardId: 'shsd_1',
      submittedStatuses: ['REVIEW', 'COMPLETED', 'CLOSED'],
    } as any);
    scopeRepository.findShowsInScope.mockResolvedValue([
      createScopedShow(),
    ]);
    scopeRepository.findSubmittedTasksInScope.mockResolvedValue([
      createScopedTask({
        snapshotSchema: {},
        content: { gmv: 200 },
      }),
    ]);
    studioService.getSharedFields.mockResolvedValue([]);

    await expect(
      service.run('std_123', taskReportRunRequestSchema.parse({
        scope: defaultReportScope,
        columns: [{ key: 'gmv', label: 'GMV' }],
      })),
    ).rejects.toThrow('Task template snapshot schema is invalid');
  });

  it('does not emit duplicate warnings for templates with no selected columns', async () => {
    const selectedSchema = TemplateSchemaValidator.parse({
      items: [
        {
          id: 'fi_1',
          key: 'gmv',
          type: 'number',
          standard: true,
          label: 'GMV',
        },
      ],
      metadata: {},
    });
    const unselectedSchema = TemplateSchemaValidator.parse({
      items: [
        {
          id: 'fi_2',
          key: 'notes',
          type: 'text',
          label: 'Notes',
        },
      ],
      metadata: {},
    });

    scopeService.preflight.mockResolvedValue({
      show_count: 1,
      task_count: 3,
      within_limit: true,
      limit: 10000,
    });
    scopeService.resolveScopeFilters.mockReturnValue({
      showStandardId: 'shsd_1',
      submittedStatuses: ['REVIEW', 'COMPLETED', 'CLOSED'],
    } as any);
    scopeRepository.findShowsInScope.mockResolvedValue([
      createScopedShow(),
    ]);
    scopeRepository.findSubmittedTasksInScope.mockResolvedValue([
      createScopedTask({
        uid: 'task_selected',
        snapshotSchema: selectedSchema,
        content: { gmv: 200 },
        assigneeUid: 'user_1',
        assigneeName: 'Alice',
      }),
      createScopedTask({
        uid: 'task_unselected_new',
        updatedAt: new Date('2026-03-17T09:00:00.000Z'),
        templateUid: 'ttpl_2',
        templateName: 'Template 2',
        snapshotId: 'snap_2',
        snapshotSchema: unselectedSchema,
        content: { notes: 'new' },
        assigneeUid: 'user_2',
        assigneeName: 'Bob',
      }),
      createScopedTask({
        uid: 'task_unselected_old',
        updatedAt: new Date('2026-03-16T09:00:00.000Z'),
        templateUid: 'ttpl_2',
        templateName: 'Template 2',
        snapshotId: 'snap_2',
        snapshotSchema: unselectedSchema,
        content: { notes: 'old' },
        assigneeUid: 'user_1',
        assigneeName: 'Alice',
      }),
    ]);
    studioService.getSharedFields.mockResolvedValue([]);

    const result = await service.run('std_123', taskReportRunRequestSchema.parse({
      scope: defaultReportScope,
      columns: [{ key: 'gmv', label: 'GMV' }],
    }));

    expect(result.warnings).toEqual([]);
    expect(result.rows[0]).toMatchObject({
      gmv: 200,
      assignee_names: ['Alice', 'Bob'],
      assignee_name: null,
    });
  });

  it('fills system columns from scoped show metadata', async () => {
    scopeService.preflight.mockResolvedValue({
      show_count: 1,
      task_count: 0,
      within_limit: true,
      limit: 10000,
    });
    scopeService.resolveScopeFilters.mockReturnValue({
      showStandardId: 'shsd_1',
      submittedStatuses: ['REVIEW', 'COMPLETED', 'CLOSED'],
    } as any);
    scopeRepository.findShowsInScope.mockResolvedValue([
      createScopedShow(),
    ]);
    scopeRepository.findSubmittedTasksInScope.mockResolvedValue([]);
    studioService.getSharedFields.mockResolvedValue([]);

    const result = await service.run('std_123', taskReportRunRequestSchema.parse({
      scope: defaultReportScope,
      columns: [
        { key: 'show_name', label: 'Show Name' },
        { key: 'client_name', label: 'Client' },
        { key: 'start_time', label: 'Start Time' },
      ],
    }));

    expect(result.row_count).toBe(1);
    expect(result.rows[0]).toMatchObject({
      show_name: 'Show 1',
      client_name: 'Client A',
      start_time: '2026-03-16T00:00:00.000Z',
      client_id: 'client_1',
      studio_room_id: 'room_1',
      show_status_id: 'shst_1',
      show_status_name: 'Confirmed',
      assignee_ids: [],
      assignee_names: [],
      assignee_id: null,
      assignee_name: null,
    });
    expect(result.columns).toMatchObject([
      { key: 'show_name', type: 'text', source_template_id: null },
      { key: 'client_name', type: 'text', source_template_id: null },
      { key: 'start_time', type: 'datetime', source_template_id: null },
    ]);
    expect(result.column_map).toEqual({
      show_name: null,
      client_name: null,
      start_time: null,
    });
  });

  it('fills show actuals system columns and derives actuals_status', async () => {
    scopeService.preflight.mockResolvedValue({
      show_count: 3,
      task_count: 0,
      within_limit: true,
      limit: 10000,
    });
    scopeService.resolveScopeFilters.mockReturnValue({
      showStandardId: 'shsd_1',
      submittedStatuses: ['REVIEW', 'COMPLETED', 'CLOSED'],
    } as any);
    scopeRepository.findShowsInScope.mockResolvedValue([
      createScopedShow({
        uid: 'show_complete',
        actualStartTime: new Date('2026-03-16T00:05:00.000Z'),
        actualEndTime: new Date('2026-03-16T02:03:00.000Z'),
      }),
      createScopedShow({
        uid: 'show_incomplete',
        actualStartTime: new Date('2026-03-16T00:05:00.000Z'),
        actualEndTime: null,
      }),
      createScopedShow({
        uid: 'show_missing',
        actualStartTime: null,
        actualEndTime: null,
      }),
    ]);
    scopeRepository.findSubmittedTasksInScope.mockResolvedValue([]);
    studioService.getSharedFields.mockResolvedValue([]);

    const result = await service.run('std_123', taskReportRunRequestSchema.parse({
      scope: defaultReportScope,
      columns: [
        { key: 'show_id', label: 'Show' },
        { key: 'actual_start_time', label: 'Actual Start' },
        { key: 'actual_end_time', label: 'Actual End' },
        { key: 'actuals_status', label: 'Actuals Status' },
      ],
    }));

    expect(result.row_count).toBe(3);
    expect(result.rows).toEqual([
      expect.objectContaining({
        show_id: 'show_complete',
        actual_start_time: '2026-03-16T00:05:00.000Z',
        actual_end_time: '2026-03-16T02:03:00.000Z',
        actuals_status: 'complete',
      }),
      expect.objectContaining({
        show_id: 'show_incomplete',
        actual_start_time: '2026-03-16T00:05:00.000Z',
        actual_end_time: null,
        actuals_status: 'incomplete',
      }),
      expect.objectContaining({
        show_id: 'show_missing',
        actual_start_time: null,
        actual_end_time: null,
        actuals_status: 'missing',
      }),
    ]);
    expect(result.columns).toMatchObject([
      { key: 'show_id', type: 'text' },
      { key: 'actual_start_time', type: 'datetime' },
      { key: 'actual_end_time', type: 'datetime' },
      { key: 'actuals_status', type: 'text' },
    ]);
  });

  it('includes show-status and multi-assignee metadata for FE-side view filters', async () => {
    scopeService.preflight.mockResolvedValue({
      show_count: 1,
      task_count: 2,
      within_limit: true,
      limit: 10000,
    });
    scopeService.resolveScopeFilters.mockReturnValue({
      showStandardId: 'shsd_1',
      submittedStatuses: ['REVIEW', 'COMPLETED', 'CLOSED'],
    } as any);
    scopeRepository.findShowsInScope.mockResolvedValue([
      createScopedShow({
        showStatusUid: 'shst_live',
        showStatusName: 'Live',
      }),
    ]);
    scopeRepository.findSubmittedTasksInScope.mockResolvedValue([
      createScopedTask({
        uid: 'task_a',
        assigneeUid: 'user_1',
        assigneeName: 'Alice',
      }),
      createScopedTask({
        uid: 'task_b',
        updatedAt: new Date('2026-03-17T09:00:00.000Z'),
        assigneeUid: 'user_2',
        assigneeName: 'Bob',
      }),
    ]);
    studioService.getSharedFields.mockResolvedValue([]);

    const result = await service.run('std_123', taskReportRunRequestSchema.parse({
      scope: defaultReportScope,
      columns: [{ key: 'show_name', label: 'Show Name' }],
    }));

    expect(result.rows[0]).toMatchObject({
      show_name: 'Show 1',
      show_status_id: 'shst_live',
      show_status_name: 'Live',
      assignee_ids: ['user_1', 'user_2'],
      assignee_names: ['Alice', 'Bob'],
      assignee_id: null,
      assignee_name: null,
    });
  });

  it('populates multiple show rows for a single multi-target task without false duplicate warning', async () => {
    const snapshotSchema = TemplateSchemaValidator.parse({
      items: [
        {
          id: 'fi_1',
          key: 'gmv',
          type: 'number',
          standard: true,
          label: 'GMV',
        },
      ],
      metadata: {},
    });

    scopeService.preflight.mockResolvedValue({
      show_count: 2,
      task_count: 1,
      within_limit: true,
      limit: 10000,
    });
    scopeService.resolveScopeFilters.mockReturnValue({
      showStandardId: 'shsd_1',
      submittedStatuses: ['REVIEW', 'COMPLETED', 'CLOSED'],
    } as any);
    scopeRepository.findShowsInScope.mockResolvedValue([
      createScopedShow({ uid: 'show_1', name: 'Show 1' }),
      createScopedShow({ uid: 'show_2', name: 'Show 2' }),
    ]);
    scopeRepository.findSubmittedTasksInScope.mockResolvedValue([
      createScopedTask({
        uid: 'task_multi',
        snapshotSchema,
        content: { gmv: 500 },
        targetShowUids: ['show_1', 'show_2'],
        assigneeUid: 'user_1',
        assigneeName: 'Alice',
      }),
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

    const result = await service.run('std_123', taskReportRunRequestSchema.parse({
      scope: defaultReportScope,
      columns: [
        { key: 'show_name', label: 'Show Name' },
        { key: 'gmv', label: 'GMV' },
      ],
    }));

    expect(result.row_count).toBe(2);
    expect(result.rows[0]).toMatchObject({ show_name: 'Show 1', gmv: 500 });
    expect(result.rows[1]).toMatchObject({ show_name: 'Show 2', gmv: 500 });
    expect(result.warnings).toEqual([]);
  });

  it('projects a platform-performance fact from the extracted ShowPlatform column, not task content', async () => {
    const snapshotSchema = TemplateSchemaV2Validator.parse({
      schema_engine: 'task_template_v2',
      schema_version: 2,
      content_key_strategy: 'field_id',
      report_projection_strategy: 'descriptor',
      items: [
        {
          id: 'fld_gmvmetric01',
          key: 'field_gmv',
          type: 'number',
          label: 'GMV',
          required: true,
          default_value: '',
          system_fact_key: 'show_platform_gmv',
        },
      ],
      metadata: { task_type: 'CLOSURE' },
    });

    scopeService.preflight.mockResolvedValue({
      show_count: 1,
      task_count: 1,
      within_limit: true,
      limit: 10000,
    });
    scopeService.resolveScopeFilters.mockReturnValue({
      submittedStatuses: ['REVIEW', 'COMPLETED', 'CLOSED'],
    } as any);
    scopeRepository.findShowsInScope.mockResolvedValue([
      createScopedShow({
        showPlatforms: [
          { gmv: new Prisma.Decimal('20766.00'), viewerCount: 0, ctr: null, cto: null, metadata: {} },
        ],
      }),
    ]);
    scopeRepository.findSubmittedTasksInScope.mockResolvedValue([
      // Stale value lingering in content must be ignored — the column is the source of truth.
      createScopedTask({
        snapshotSchema,
        content: { 'fld_gmvmetric01:platform:show_plt_shopee': 999999 },
      }),
    ]);
    studioService.getSharedFields.mockResolvedValue([]);

    const result = await service.run('std_123', taskReportRunRequestSchema.parse({
      scope: defaultReportScope,
      columns: [{ key: 'ttpl_1:field_gmv', label: 'GMV' }],
    }));

    expect(result.rows[0]).toMatchObject({
      'ttpl_1:field_gmv': 20766,
    });
  });

  it('aggregates platform-performance columns with the performance read-model semantics', async () => {
    const snapshotSchema = TemplateSchemaV2Validator.parse({
      schema_engine: 'task_template_v2',
      schema_version: 2,
      content_key_strategy: 'field_id',
      report_projection_strategy: 'descriptor',
      items: [
        {
          id: 'fld_gmvmetric01',
          key: 'field_gmv',
          type: 'number',
          label: 'GMV',
          required: true,
          default_value: '',
          system_fact_key: 'show_platform_gmv',
        },
        {
          id: 'fld_viewmetric1',
          key: 'field_views',
          type: 'number',
          label: 'View',
          required: true,
          default_value: '',
          system_fact_key: 'show_platform_view_count',
        },
        {
          id: 'fld_ctrmetric01',
          key: 'field_ctr',
          type: 'number',
          label: 'CTR',
          required: true,
          default_value: '',
          system_fact_key: 'show_platform_ctr',
        },
        {
          id: 'fld_ctometric01',
          key: 'field_cto',
          type: 'number',
          label: 'CTO',
          required: true,
          default_value: '',
          system_fact_key: 'show_platform_cto',
        },
      ],
      metadata: { task_type: 'CLOSURE' },
    });

    scopeService.preflight.mockResolvedValue({
      show_count: 1,
      task_count: 1,
      within_limit: true,
      limit: 10000,
    });
    scopeService.resolveScopeFilters.mockReturnValue({
      submittedStatuses: ['REVIEW', 'COMPLETED', 'CLOSED'],
    } as any);
    scopeRepository.findShowsInScope.mockResolvedValue([
      createScopedShow({
        showPlatforms: [
          {
            gmv: new Prisma.Decimal('100.00'),
            viewerCount: 10,
            ctr: new Prisma.Decimal('4.00'),
            cto: new Prisma.Decimal('2.00'),
            metadata: viewCountMetadata,
          },
          {
            gmv: new Prisma.Decimal('25.00'),
            viewerCount: 5,
            ctr: new Prisma.Decimal('8.00'),
            cto: new Prisma.Decimal('4.00'),
            metadata: viewCountMetadata,
          },
        ],
      }),
    ]);
    scopeRepository.findSubmittedTasksInScope.mockResolvedValue([
      createScopedTask({ snapshotSchema, content: {} }),
    ]);
    studioService.getSharedFields.mockResolvedValue([]);

    const result = await service.run('std_123', taskReportRunRequestSchema.parse({
      scope: defaultReportScope,
      columns: [
        { key: 'ttpl_1:field_gmv', label: 'GMV' },
        { key: 'ttpl_1:field_views', label: 'View' },
        { key: 'ttpl_1:field_ctr', label: 'CTR' },
        { key: 'ttpl_1:field_cto', label: 'CTO' },
      ],
    }));

    expect(result.rows[0]).toMatchObject({
      'ttpl_1:field_gmv': 125,
      'ttpl_1:field_views': 15,
      'ttpl_1:field_ctr': 6,
      'ttpl_1:field_cto': 3,
    });
  });

  it('rejects a hydrated fact column that has no per-show projection', async () => {
    const snapshotSchema = TemplateSchemaV2Validator.parse({
      schema_engine: 'task_template_v2',
      schema_version: 2,
      content_key_strategy: 'field_id',
      report_projection_strategy: 'descriptor',
      items: [
        {
          id: 'fld_violation01',
          key: 'field_violation',
          type: 'multiselect',
          label: 'Violation',
          required: false,
          default_value: '',
          options: [{ label: 'Warning', value: 'warning' }],
          system_fact_key: 'show_platform_violation',
        },
      ],
      metadata: { task_type: 'CLOSURE' },
    });

    scopeService.preflight.mockResolvedValue({
      show_count: 1,
      task_count: 1,
      within_limit: true,
      limit: 10000,
    });
    scopeService.resolveScopeFilters.mockReturnValue({
      submittedStatuses: ['REVIEW', 'COMPLETED', 'CLOSED'],
    } as any);
    scopeRepository.findShowsInScope.mockResolvedValue([createScopedShow()]);
    scopeRepository.findSubmittedTasksInScope.mockResolvedValue([
      createScopedTask({ snapshotSchema, content: {} }),
    ]);
    studioService.getSharedFields.mockResolvedValue([]);

    await expect(
      service.run('std_123', taskReportRunRequestSchema.parse({
        scope: defaultReportScope,
        columns: [{ key: 'ttpl_1:field_violation', label: 'Violation' }],
      })),
    ).rejects.toThrow(/cannot be projected/i);
  });
});
