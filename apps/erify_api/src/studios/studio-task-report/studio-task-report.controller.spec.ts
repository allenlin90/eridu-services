import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';

import {
  createTaskReportDefinitionSchema,
  getTaskReportSourcesQuerySchema,
  listTaskReportDefinitionsQuerySchema,
  taskReportDefinitionSchema,
  taskReportPreflightRequestSchema,
  taskReportRunRequestSchema,
  updateTaskReportDefinitionSchema,
} from '@eridu/api-types/task-management';

import { StudioTaskReportController } from './studio-task-report.controller';

import type { AuthenticatedUser } from '@/lib/auth/jwt-auth.guard';
import { TaskReportDefinitionService } from '@/models/task-report/task-report-definition.service';
import { TaskReportRunService } from '@/models/task-report/task-report-run.service';
import { TaskReportScopeService } from '@/models/task-report/task-report-scope.service';

describe('studioTaskReportController', () => {
  const defaultScope = {
    date_from: '2026-03-01',
    date_to: '2026-03-31',
    show_standard_id: 'shsd_1',
  } as const;

  let controller: StudioTaskReportController;
  let definitionService: jest.Mocked<TaskReportDefinitionService>;
  let scopeService: jest.Mocked<TaskReportScopeService>;
  let runService: jest.Mocked<TaskReportRunService>;
  const user: AuthenticatedUser = {
    ext_id: 'ext_1',
    id: 'ext_1',
    name: 'User',
    email: 'user@eridu.com',
    payload: {} as AuthenticatedUser['payload'],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [StudioTaskReportController],
      providers: [
        {
          provide: TaskReportDefinitionService,
          useValue: {
            listDefinitions: jest.fn(),
            getDefinition: jest.fn(),
            createDefinition: jest.fn(),
            updateDefinition: jest.fn(),
            deleteDefinition: jest.fn(),
          },
        },
        {
          provide: TaskReportScopeService,
          useValue: {
            getSources: jest.fn(),
            preflight: jest.fn(),
          },
        },
        {
          provide: TaskReportRunService,
          useValue: {
            run: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<StudioTaskReportController>(StudioTaskReportController);
    definitionService = module.get(TaskReportDefinitionService);
    scopeService = module.get(TaskReportScopeService);
    runService = module.get(TaskReportRunService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('delegates definition list endpoint', async () => {
    const query = listTaskReportDefinitionsQuerySchema.parse({
      page: 1,
      limit: 20,
      search: 'weekly',
    });
    const definition = taskReportDefinitionSchema.parse({
      id: 'trd_1',
      name: 'Weekly',
      definition: {
        scope: defaultScope,
        columns: [{ key: 'gmv', label: 'GMV' }],
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    definitionService.listDefinitions.mockResolvedValue({
      data: [definition],
      total: 1,
    });

    const result = await controller.listDefinitions('std_123', user, query);
    expect(result.data).toEqual([definition]);
    expect(result.meta.total).toBe(1);
    expect(definitionService.listDefinitions).toHaveBeenCalledWith('std_123', 'ext_1', {
      skip: 0,
      take: 20,
      search: query.search,
    });
  });

  it('delegates definition detail endpoint', async () => {
    const definition = taskReportDefinitionSchema.parse({
      id: 'trd_1',
      name: 'Weekly',
      definition: {
        scope: defaultScope,
        columns: [{ key: 'gmv', label: 'GMV' }],
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    definitionService.getDefinition.mockResolvedValue(definition);

    await expect(controller.getDefinition('std_123', user, 'trd_123')).resolves.toEqual(definition);
    expect(definitionService.getDefinition).toHaveBeenCalledWith('std_123', 'ext_1', 'trd_123');
  });

  it('delegates definition create endpoint', async () => {
    const payload = createTaskReportDefinitionSchema.parse({
      name: 'Weekly review',
      definition: {
        scope: defaultScope,
        columns: [{ key: 'gmv', label: 'GMV' }],
      },
    });
    const definition = taskReportDefinitionSchema.parse({
      id: 'trd_1',
      name: 'Weekly review',
      definition: payload.definition,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    definitionService.createDefinition.mockResolvedValue(definition);

    await expect(controller.createDefinition('std_123', user, payload)).resolves.toEqual(definition);
    expect(definitionService.createDefinition).toHaveBeenCalledWith('std_123', 'ext_1', payload);
  });

  it('delegates definition update endpoint', async () => {
    const payload = updateTaskReportDefinitionSchema.parse({ name: 'Weekly review v2' });
    const definition = taskReportDefinitionSchema.parse({
      id: 'trd_1',
      name: 'Weekly review v2',
      definition: {
        scope: defaultScope,
        columns: [{ key: 'gmv', label: 'GMV' }],
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    definitionService.updateDefinition.mockResolvedValue(definition);

    await expect(controller.updateDefinition('std_123', user, 'trd_123', payload)).resolves.toEqual(definition);
    expect(definitionService.updateDefinition).toHaveBeenCalledWith('std_123', 'ext_1', 'trd_123', payload);
  });

  it('delegates definition delete endpoint', async () => {
    definitionService.deleteDefinition.mockResolvedValue(undefined);

    await expect(controller.deleteDefinition('std_123', user, 'trd_123')).resolves.toBeUndefined();
    expect(definitionService.deleteDefinition).toHaveBeenCalledWith('std_123', 'ext_1', 'trd_123');
  });

  it('delegates sources endpoint', async () => {
    const query = getTaskReportSourcesQuerySchema.parse(defaultScope);
    scopeService.getSources.mockResolvedValue({
      sources: [],
      shared_fields: [],
    });

    await expect(controller.getSources('std_123', query)).resolves.toEqual({
      sources: [],
      shared_fields: [],
    });
    expect(scopeService.getSources).toHaveBeenCalledWith('std_123', query);
  });

  it('delegates preflight endpoint', async () => {
    const payload = taskReportPreflightRequestSchema.parse({
      scope: {
        date_from: '2026-03-01',
        date_to: '2026-03-31',
        show_ids: ['show_1'],
      },
    });
    scopeService.preflight.mockResolvedValue({
      show_count: 12,
      task_count: 40,
      within_limit: true,
      limit: 10000,
    });

    await expect(controller.preflight('std_123', payload)).resolves.toEqual({
      show_count: 12,
      task_count: 40,
      within_limit: true,
      limit: 10000,
    });
    expect(scopeService.preflight).toHaveBeenCalledWith('std_123', payload);
  });

  it('delegates run endpoint', async () => {
    const payload = taskReportRunRequestSchema.parse({
      scope: defaultScope,
      columns: [{ key: 'gmv', label: 'GMV' }],
    });
    runService.run.mockResolvedValue({
      rows: [],
      columns: [],
      column_map: {},
      warnings: [],
      row_count: 0,
      generated_at: new Date().toISOString(),
    });

    await expect(controller.runReport('std_123', payload)).resolves.toMatchObject({
      row_count: 0,
    });
    expect(runService.run).toHaveBeenCalledWith('std_123', payload);
  });
});
