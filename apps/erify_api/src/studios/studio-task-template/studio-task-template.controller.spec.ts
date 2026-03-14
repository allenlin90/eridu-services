import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';

import { StudioTaskTemplateController } from './studio-task-template.controller';

import { READ_BURST_THROTTLE_KEY } from '@/lib/guards/read-burst-throttle.decorator';
import { StudioService } from '@/models/studio/studio.service';
import type { ListTaskTemplatesQueryDto } from '@/models/task-template/schemas/task-template.schema';
import { TaskTemplateService } from '@/models/task-template/task-template.service';

// Mirrors the metadata key set by SkipThrottle({ default: true }):
// THROTTLER_SKIP ("THROTTLER:SKIP") concatenated with the throttler name ("default").
// Avoids importing from @nestjs/throttler internal dist path.
const THROTTLER_SKIP_DEFAULT_KEY = 'THROTTLER:SKIPdefault';

describe('studioTaskTemplateController', () => {
  let controller: StudioTaskTemplateController;
  let taskTemplateService: jest.Mocked<TaskTemplateService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [StudioTaskTemplateController],
      providers: [
        {
          provide: TaskTemplateService,
          useValue: {
            getTaskTemplates: jest.fn(),
            findOne: jest.fn(),
            updateTemplateWithSnapshot: jest.fn(),
            softDelete: jest.fn(),
          },
        },
        {
          provide: StudioService,
          useValue: {},
        },
      ],
    }).compile();

    controller = module.get<StudioTaskTemplateController>(StudioTaskTemplateController);
    taskTemplateService = module.get(TaskTemplateService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('index', () => {
    it('opts index route into read-burst profile and skips default throttle profile', () => {
      const handler = StudioTaskTemplateController.prototype.index;

      expect(Reflect.getMetadata(READ_BURST_THROTTLE_KEY, handler)).toBe(true);
      expect(Reflect.getMetadata(THROTTLER_SKIP_DEFAULT_KEY, handler)).toBe(true);
    });

    it('should call getTaskTemplates with correct filters', async () => {
      const studioId = 'studio_123';
      const query: ListTaskTemplatesQueryDto = {
        page: 1,
        limit: 10,
        skip: 0,
        take: 10,
        sort: 'desc',
        name: 'test',
        uid: 'ttpl_123',
        includeDeleted: false,
      };

      taskTemplateService.getTaskTemplates.mockResolvedValue({ data: [], total: 0 });

      await controller.index(studioId, query);

      expect(taskTemplateService.getTaskTemplates).toHaveBeenCalledWith({
        skip: 0,
        take: 10,
        name: 'test',
        uid: 'ttpl_123',
        includeDeleted: false,
        studioUid: studioId,
        orderBy: 'desc',
      });
    });
  });

  describe('show', () => {
    it('should call findOne with correct id', async () => {
      const studioId = 'studio_123';
      const id = 'ttpl_123';
      const result = { uid: id } as any;

      taskTemplateService.findOne.mockResolvedValue(result);

      expect(await controller.show(studioId, id)).toEqual(result);
      expect(taskTemplateService.findOne).toHaveBeenCalledWith({
        uid: id,
        studio: { uid: studioId },
        deletedAt: null,
      });
    });
  });

  describe('update', () => {
    it('should call updateTemplateWithSnapshot with correct data', async () => {
      const studioId = 'studio_123';
      const id = 'ttpl_123';
      const updateDto = {
        name: 'Updated Name',
        description: 'Updated Description',
        version: 1,
        schema: { type: 'object' },
      };
      const result = { uid: id, ...updateDto, version: 2 } as any;

      taskTemplateService.updateTemplateWithSnapshot.mockResolvedValue(result);

      expect(await controller.update(studioId, id, updateDto)).toEqual(result);

      expect(taskTemplateService.updateTemplateWithSnapshot).toHaveBeenCalledWith(
        id,
        studioId,
        {
          name: updateDto.name,
          description: updateDto.description,
          currentSchema: updateDto.schema,
          version: 1,
        },
      );
    });

    it('should handle updates without schema changes', async () => {
      const studioId = 'studio_123';
      const id = 'ttpl_123';
      const updateDto = {
        name: 'Updated Name Only',
        version: 1,
      };
      const result = { uid: id, name: updateDto.name, version: 1 } as any;

      taskTemplateService.updateTemplateWithSnapshot.mockResolvedValue(result);

      expect(await controller.update(studioId, id, updateDto)).toEqual(result);

      expect(taskTemplateService.updateTemplateWithSnapshot).toHaveBeenCalledWith(
        id,
        studioId,
        {
          name: updateDto.name,
          description: undefined,
          currentSchema: undefined,
          version: 1,
        },
      );
    });

    it('should throw 404 when template not found', async () => {
      const studioId = 'studio_123';
      const id = 'ttpl_invalid';
      const updateDto = {
        name: 'Updated Name',
        version: 1,
      };

      const notFoundError = new Error('Task template not found');
      (notFoundError as any).statusCode = 404;
      taskTemplateService.updateTemplateWithSnapshot.mockRejectedValue(notFoundError);

      await expect(controller.update(studioId, id, updateDto)).rejects.toThrow();
    });
  });

  describe('delete', () => {
    it('should call softDelete with correct id', async () => {
      const studioId = 'studio_123';
      const id = 'ttpl_123';
      const result = { uid: id } as any;

      taskTemplateService.findOne.mockResolvedValue(result);
      taskTemplateService.softDelete.mockResolvedValue(result);

      expect(await controller.delete(studioId, id)).toBeUndefined();

      expect(taskTemplateService.softDelete).toHaveBeenCalledWith({
        uid: id,
        studio: { uid: studioId },
        deletedAt: null,
      });
    });

    it('should assume success if template verification is handled by service or repository', async () => {
      // Since user removed the explicit findOne check in the controller,
      // the controller delegates entirely to the service.
      // If the service/repo throws on not found, the global exception filter handles it.
      // Here we just test the delegation.
      const studioId = 'studio_123';
      const id = 'ttpl_invalid';

      taskTemplateService.softDelete.mockResolvedValue(null as any);

      await controller.delete(studioId, id);
      expect(taskTemplateService.softDelete).toHaveBeenCalledWith({
        uid: id,
        studio: { uid: studioId },
        deletedAt: null,
      });
    });
  });
});
