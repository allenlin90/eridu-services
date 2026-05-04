import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';

import { taskReportRunRequestSchema, TemplateSchemaValidator } from '@eridu/api-types/task-management';

import { TaskReportRunService } from './task-report-run.service';
import { TaskReportScopeRepository } from './task-report-scope.repository';
import { TaskReportScopeService } from './task-report-scope.service';

import { StudioService } from '@/models/studio/studio.service';

describe('taskReportRunService', () => {
  const defaultReportScope = {
    date_from: '2026-03-01',
    date_to: '2026-03-31',
    show_standard_id: 'shsd_1',
  } as const;
  const createScopedShow = (overrides: Record<string, unknown> = {}) => ({
    uid: 'show_1',
    name: 'Show 1',
    externalId: 'EXT-1',
    startTime: new Date('2026-03-16T00:00:00.000Z'),
    endTime: new Date('2026-03-16T02:00:00.000Z'),
    clientUid: 'client_1',
    clientName: 'Client A',
    studioRoomUid: 'room_1',
    studioRoomName: 'Room A',
    showStatusUid: 'shst_1',
    showStatusName: 'Confirmed',
    showStandardName: 'Standard A',
    showTypeName: 'Type A',
    ...overrides,
  });
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

  it('includes sidecar explanations and extra input data in the selected report column', async () => {
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
      columns: [{ key: 'ttpl_1:live_title', label: 'Live title' }],
    }));

    expect(result.rows[0]).toMatchObject({
      'ttpl_1:live_title': [
        'not_correct',
        'Explanation: Title does not match the approved run sheet.',
        'Cause: OBS scene was stale',
        'Reported By: Operator A',
      ].join('\n'),
    });
  });

  it('projects field-id keyed object input values with explanations into descriptor columns', async () => {
    const snapshotSchema = TemplateSchemaValidator.parse({
      items: [
        {
          id: 'fld_product_sample',
          key: 'product_sample',
          type: 'select',
          label: 'Product sample check',
          options: [
            { value: 'available', label: 'Available' },
            { value: 'missing', label: 'Missing' },
          ],
          validation: {
            require_reason: [{ op: 'neq', value: 'available' }],
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
          fld_product_sample: {
            value: 'missing',
            explanation: 'Sample was not delivered before the show started.',
            cause: 'Courier delay',
          },
        },
      }),
    ]);
    studioService.getSharedFields.mockResolvedValue([]);

    const result = await service.run('std_123', taskReportRunRequestSchema.parse({
      scope: defaultReportScope,
      columns: [{ key: 'ttpl_1:product_sample', label: 'Product sample check' }],
    }));

    expect(result.rows[0]).toMatchObject({
      'ttpl_1:product_sample': [
        'missing',
        'Explanation: Sample was not delivered before the show started.',
        'Cause: Courier delay',
      ].join('\n'),
    });
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
});
