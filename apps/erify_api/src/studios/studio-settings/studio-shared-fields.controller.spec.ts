import { ConflictException, NotFoundException } from '@nestjs/common';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';

import { StudioSharedFieldsController } from './studio-shared-fields.controller';

import { StudioService } from '@/models/studio/studio.service';

describe('studioSharedFieldsController', () => {
  let controller: StudioSharedFieldsController;
  let studioService: jest.Mocked<StudioService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [StudioSharedFieldsController],
      providers: [
        {
          provide: StudioService,
          useValue: {
            getSharedFields: jest.fn(),
            createSharedField: jest.fn(),
            updateSharedField: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<StudioSharedFieldsController>(StudioSharedFieldsController);
    studioService = module.get(StudioService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('lists shared fields', async () => {
    studioService.getSharedFields.mockResolvedValue([
      {
        key: 'gmv',
        type: 'number',
        category: 'metric',
        label: 'GMV',
        is_active: true,
      },
    ] as any);

    const result = await controller.listSharedFields('std_123');

    expect(studioService.getSharedFields).toHaveBeenCalledWith('std_123');
    expect(result.shared_fields).toHaveLength(1);
  });

  it('creates a shared field', async () => {
    const dto = {
      key: 'views',
      type: 'number',
      category: 'metric',
      label: 'Views',
    };

    studioService.createSharedField.mockResolvedValue([
      {
        ...dto,
        is_active: true,
      },
    ] as any);

    const result = await controller.createSharedField('std_123', dto as any);

    expect(studioService.createSharedField).toHaveBeenCalledWith('std_123', dto);
    expect(result.shared_fields[0]?.key).toBe('views');
  });

  it('propagates duplicate-key conflict on create', async () => {
    const dto = {
      key: 'views',
      type: 'number',
      category: 'metric',
      label: 'Views',
    };
    studioService.createSharedField.mockRejectedValue(new ConflictException('duplicate key'));

    await expect(controller.createSharedField('std_123', dto as any)).rejects.toThrow(
      ConflictException,
    );
  });

  it('updates mutable shared field properties', async () => {
    const dto = {
      label: 'Views Count',
      is_active: false,
    };

    studioService.updateSharedField.mockResolvedValue([
      {
        key: 'views',
        type: 'number',
        category: 'metric',
        label: 'Views Count',
        is_active: false,
      },
    ] as any);

    const result = await controller.updateSharedField('std_123', 'views', dto as any);

    expect(studioService.updateSharedField).toHaveBeenCalledWith('std_123', 'views', dto);
    expect(result.shared_fields[0]?.is_active).toBe(false);
  });

  it('rejects invalid shared field key format on update', async () => {
    await expect(
      controller.updateSharedField('std_123', 'INVALID-KEY', { label: 'x' } as any),
    ).rejects.toThrow('Shared field key must be snake_case (English)');

    expect(studioService.updateSharedField).not.toHaveBeenCalled();
  });

  it('propagates not found when updating missing shared field', async () => {
    studioService.updateSharedField.mockRejectedValue(new NotFoundException('missing key'));

    await expect(
      controller.updateSharedField('std_123', 'views', { label: 'x' } as any),
    ).rejects.toThrow(NotFoundException);
  });
});
