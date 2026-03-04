import { ConfigService } from '@nestjs/config';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';

import { BackdoorTaskTemplateController } from './backdoor-task-template.controller';

import { BackdoorApiKeyGuard } from '@/lib/guards/backdoor-api-key.guard';
import { TaskTemplateService } from '@/models/task-template/task-template.service';

describe('backdoorTaskTemplateController', () => {
  let controller: BackdoorTaskTemplateController;

  const mockTaskTemplateService = {
    createTemplateWithSnapshot: jest.fn(),
  };

  beforeEach(async () => {
    const mockConfigService = {
      get: jest.fn((key: string) => {
        if (key === 'BACKDOOR_API_KEY')
          return undefined;
        if (key === 'NODE_ENV')
          return 'development';
        return undefined;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [BackdoorTaskTemplateController],
      providers: [
        { provide: TaskTemplateService, useValue: mockTaskTemplateService },
        { provide: ConfigService, useValue: mockConfigService },
        BackdoorApiKeyGuard,
      ],
    }).compile();

    controller = module.get<BackdoorTaskTemplateController>(BackdoorTaskTemplateController);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates template with studio-like contract', async () => {
    const dto = {
      name: 'Bata BAU',
      description: 'desc',
      task_type: 'ACTIVE' as const,
      schema: {
        items: [
          {
            id: 'field_1',
            key: 'l1_step_1',
            type: 'checkbox' as const,
            label: 'Step 1',
            required: true,
            group: 'l1',
          },
        ],
        metadata: {
          loops: [{ id: 'l1', name: 'Loop1', durationMin: 15 }],
        },
      },
    };

    mockTaskTemplateService.createTemplateWithSnapshot.mockResolvedValue({
      uid: 'ttpl_created',
      name: dto.name,
    });

    const result = await controller.create('std_00000000000000000001', dto);

    expect(mockTaskTemplateService.createTemplateWithSnapshot).toHaveBeenCalledWith({
      name: 'Bata BAU',
      description: 'desc',
      taskType: 'ACTIVE',
      currentSchema: dto.schema,
      studioId: 'std_00000000000000000001',
    });
    expect(result).toEqual({ uid: 'ttpl_created', name: 'Bata BAU' });
  });
});
