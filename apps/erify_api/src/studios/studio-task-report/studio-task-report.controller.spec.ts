import { NotImplementedException } from '@nestjs/common';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';

import { StudioTaskReportController } from './studio-task-report.controller';

import { TaskReportDefinitionService } from '@/models/task-report/task-report-definition.service';
import { TaskReportRunService } from '@/models/task-report/task-report-run.service';
import { TaskReportScopeService } from '@/models/task-report/task-report-scope.service';

describe('studioTaskReportController', () => {
  let controller: StudioTaskReportController;
  let definitionService: jest.Mocked<TaskReportDefinitionService>;
  let scopeService: jest.Mocked<TaskReportScopeService>;
  let runService: jest.Mocked<TaskReportRunService>;

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
    const err = new NotImplementedException('list');
    definitionService.listDefinitions.mockRejectedValue(err);

    await expect(controller.listDefinitions('std_123')).rejects.toThrow(NotImplementedException);
    expect(definitionService.listDefinitions).toHaveBeenCalledWith('std_123');
  });

  it('delegates definition detail endpoint', async () => {
    const err = new NotImplementedException('detail');
    definitionService.getDefinition.mockRejectedValue(err);

    await expect(controller.getDefinition('std_123', 'trd_123')).rejects.toThrow(NotImplementedException);
    expect(definitionService.getDefinition).toHaveBeenCalledWith('std_123', 'trd_123');
  });

  it('delegates definition create endpoint', async () => {
    const payload = { name: 'Weekly review' };
    const err = new NotImplementedException('create');
    definitionService.createDefinition.mockRejectedValue(err);

    await expect(controller.createDefinition('std_123', payload)).rejects.toThrow(NotImplementedException);
    expect(definitionService.createDefinition).toHaveBeenCalledWith('std_123', payload);
  });

  it('delegates definition update endpoint', async () => {
    const payload = { name: 'Weekly review v2' };
    const err = new NotImplementedException('update');
    definitionService.updateDefinition.mockRejectedValue(err);

    await expect(controller.updateDefinition('std_123', 'trd_123', payload)).rejects.toThrow(
      NotImplementedException,
    );
    expect(definitionService.updateDefinition).toHaveBeenCalledWith('std_123', 'trd_123', payload);
  });

  it('delegates definition delete endpoint', async () => {
    const err = new NotImplementedException('delete');
    definitionService.deleteDefinition.mockRejectedValue(err);

    await expect(controller.deleteDefinition('std_123', 'trd_123')).rejects.toThrow(NotImplementedException);
    expect(definitionService.deleteDefinition).toHaveBeenCalledWith('std_123', 'trd_123');
  });

  it('delegates sources endpoint', async () => {
    const query = { show_standard_id: 'stds_1' };
    const err = new NotImplementedException('sources');
    scopeService.getSources.mockRejectedValue(err);

    await expect(controller.getSources('std_123', query)).rejects.toThrow(NotImplementedException);
    expect(scopeService.getSources).toHaveBeenCalledWith('std_123', query);
  });

  it('delegates preflight endpoint', async () => {
    const payload = { scope: { show_ids: ['show_1'] } };
    const err = new NotImplementedException('preflight');
    scopeService.preflight.mockRejectedValue(err);

    await expect(controller.preflight('std_123', payload)).rejects.toThrow(NotImplementedException);
    expect(scopeService.preflight).toHaveBeenCalledWith('std_123', payload);
  });

  it('delegates run endpoint', async () => {
    const payload = { scope: { show_ids: ['show_1'] }, columns: [{ key: 'gmv', label: 'GMV' }] };
    const err = new NotImplementedException('run');
    runService.run.mockRejectedValue(err);

    await expect(controller.runReport('std_123', payload)).rejects.toThrow(NotImplementedException);
    expect(runService.run).toHaveBeenCalledWith('std_123', payload);
  });
});
