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
      {
        uid: 'show_1',
        name: 'Show 1',
        externalId: 'EXT-1',
        startTime: new Date('2026-03-16T00:00:00.000Z'),
        endTime: new Date('2026-03-16T02:00:00.000Z'),
        clientName: 'Client A',
        studioRoomName: 'Room A',
        showStandardName: 'Standard A',
        showTypeName: 'Type A',
      },
      {
        uid: 'show_2',
        name: 'Show 2',
        externalId: 'EXT-2',
        startTime: new Date('2026-03-15T00:00:00.000Z'),
        endTime: new Date('2026-03-15T02:00:00.000Z'),
        clientName: 'Client B',
        studioRoomName: 'Room B',
        showStandardName: 'Standard A',
        showTypeName: 'Type A',
      },
    ]);
    scopeRepository.findSubmittedTasksInScope.mockResolvedValue([
      {
        uid: 'task_new',
        updatedAt: new Date('2026-03-17T10:00:00.000Z'),
        templateUid: 'ttpl_1',
        templateName: 'Template 1',
        snapshotId: 'snap_1',
        snapshotSchema,
        content: { gmv: 200, notes: 'new notes' },
        targetShowUids: ['show_1'],
      },
      {
        uid: 'task_old',
        updatedAt: new Date('2026-03-16T10:00:00.000Z'),
        templateUid: 'ttpl_1',
        templateName: 'Template 1',
        snapshotId: 'snap_1',
        snapshotSchema,
        content: { gmv: 100, notes: 'old notes' },
        targetShowUids: ['show_1'],
      },
      {
        uid: 'task_show2',
        updatedAt: new Date('2026-03-17T10:00:00.000Z'),
        templateUid: 'ttpl_2',
        templateName: 'Template 2',
        snapshotId: 'snap_2',
        snapshotSchema,
        content: { gmv: 300 },
        targetShowUids: ['show_2'],
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
    ]);

    const result = await service.run('std_123', taskReportRunRequestSchema.parse({
      scope: defaultReportScope,
      columns: [
        { key: 'gmv', label: 'GMV' },
        { key: 'ttpl_1:notes', label: 'Notes' },
      ],
    }));

    expect(result.row_count).toBe(2);
    expect(result.rows[0]).toMatchObject({ 'gmv': 200, 'ttpl_1:notes': 'new notes' });
    expect(result.rows[1]).toMatchObject({ 'gmv': 300, 'ttpl_1:notes': null });
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]).toMatchObject({
      code: 'DUPLICATE_SOURCE',
      show_id: 'show_1',
    });
    expect(result.column_map).toEqual({
      'gmv': null,
      'ttpl_1:notes': 'ttpl_1',
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
      {
        uid: 'show_1',
        name: 'Show 1',
        externalId: 'EXT-1',
        startTime: new Date('2026-03-16T00:00:00.000Z'),
        endTime: new Date('2026-03-16T02:00:00.000Z'),
        clientName: 'Client A',
        studioRoomName: 'Room A',
        showStandardName: 'Standard A',
        showTypeName: 'Type A',
      },
    ]);
    scopeRepository.findSubmittedTasksInScope.mockResolvedValue([
      {
        uid: 'task_1',
        updatedAt: new Date('2026-03-17T10:00:00.000Z'),
        templateUid: 'ttpl_1',
        templateName: 'Template 1',
        snapshotId: 'snap_1',
        snapshotSchema,
        content: { gmv: 200 },
        targetShowUids: ['show_1'],
      },
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
      {
        uid: 'show_1',
        name: 'Show 1',
        externalId: 'EXT-1',
        startTime: new Date('2026-03-16T00:00:00.000Z'),
        endTime: new Date('2026-03-16T02:00:00.000Z'),
        clientName: 'Client A',
        studioRoomName: 'Room A',
        showStandardName: 'Standard A',
        showTypeName: 'Type A',
      },
    ]);
    scopeRepository.findSubmittedTasksInScope.mockResolvedValue([
      {
        uid: 'task_1',
        updatedAt: new Date('2026-03-17T10:00:00.000Z'),
        templateUid: 'ttpl_1',
        templateName: 'Template 1',
        snapshotId: 'snap_1',
        snapshotSchema,
        content: { gmv: 200 },
        targetShowUids: ['show_1'],
      },
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
      {
        uid: 'show_1',
        name: 'Show 1',
        externalId: 'EXT-1',
        startTime: new Date('2026-03-16T00:00:00.000Z'),
        endTime: new Date('2026-03-16T02:00:00.000Z'),
        clientName: 'Client A',
        studioRoomName: 'Room A',
        showStandardName: 'Standard A',
        showTypeName: 'Type A',
      },
    ]);
    scopeRepository.findSubmittedTasksInScope.mockResolvedValue([
      {
        uid: 'task_1',
        updatedAt: new Date('2026-03-17T10:00:00.000Z'),
        templateUid: 'ttpl_1',
        templateName: 'Template 1',
        snapshotId: 'snap_1',
        snapshotSchema,
        content: { notes: 'hello' },
        targetShowUids: ['show_1'],
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
      {
        uid: 'show_1',
        name: 'Show 1',
        externalId: 'EXT-1',
        startTime: new Date('2026-03-16T00:00:00.000Z'),
        endTime: new Date('2026-03-16T02:00:00.000Z'),
        clientName: 'Client A',
        studioRoomName: 'Room A',
        showStandardName: 'Standard A',
        showTypeName: 'Type A',
      },
    ]);
    scopeRepository.findSubmittedTasksInScope.mockResolvedValue([
      {
        uid: 'task_1',
        updatedAt: new Date('2026-03-17T10:00:00.000Z'),
        templateUid: 'ttpl_1',
        templateName: 'Template 1',
        snapshotId: 'snap_1',
        snapshotSchema: {},
        content: { gmv: 200 },
        targetShowUids: ['show_1'],
      },
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
      {
        uid: 'show_1',
        name: 'Show 1',
        externalId: 'EXT-1',
        startTime: new Date('2026-03-16T00:00:00.000Z'),
        endTime: new Date('2026-03-16T02:00:00.000Z'),
        clientName: 'Client A',
        studioRoomName: 'Room A',
        showStandardName: 'Standard A',
        showTypeName: 'Type A',
      },
    ]);
    scopeRepository.findSubmittedTasksInScope.mockResolvedValue([
      {
        uid: 'task_selected',
        updatedAt: new Date('2026-03-17T10:00:00.000Z'),
        templateUid: 'ttpl_1',
        templateName: 'Template 1',
        snapshotId: 'snap_1',
        snapshotSchema: selectedSchema,
        content: { gmv: 200 },
        targetShowUids: ['show_1'],
      },
      {
        uid: 'task_unselected_new',
        updatedAt: new Date('2026-03-17T09:00:00.000Z'),
        templateUid: 'ttpl_2',
        templateName: 'Template 2',
        snapshotId: 'snap_2',
        snapshotSchema: unselectedSchema,
        content: { notes: 'new' },
        targetShowUids: ['show_1'],
      },
      {
        uid: 'task_unselected_old',
        updatedAt: new Date('2026-03-16T09:00:00.000Z'),
        templateUid: 'ttpl_2',
        templateName: 'Template 2',
        snapshotId: 'snap_2',
        snapshotSchema: unselectedSchema,
        content: { notes: 'old' },
        targetShowUids: ['show_1'],
      },
    ]);
    studioService.getSharedFields.mockResolvedValue([]);

    const result = await service.run('std_123', taskReportRunRequestSchema.parse({
      scope: defaultReportScope,
      columns: [{ key: 'gmv', label: 'GMV' }],
    }));

    expect(result.warnings).toEqual([]);
    expect(result.rows[0]).toMatchObject({ gmv: 200 });
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
      {
        uid: 'show_1',
        name: 'Show 1',
        externalId: 'EXT-1',
        startTime: new Date('2026-03-16T00:00:00.000Z'),
        endTime: new Date('2026-03-16T02:00:00.000Z'),
        clientName: 'Client A',
        studioRoomName: 'Room A',
        showStandardName: 'Standard A',
        showTypeName: 'Type A',
      },
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
    expect(result.rows[0]).toEqual({
      show_name: 'Show 1',
      client_name: 'Client A',
      start_time: '2026-03-16T00:00:00.000Z',
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
});
