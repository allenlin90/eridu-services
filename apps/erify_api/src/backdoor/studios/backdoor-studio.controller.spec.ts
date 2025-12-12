import { ConfigService } from '@nestjs/config';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';

import { BackdoorStudioController } from './backdoor-studio.controller';

import { BackdoorApiKeyGuard } from '@/lib/guards/backdoor-api-key.guard';
import type {
  CreateStudioDto,
  UpdateStudioDto,
} from '@/models/studio/schemas/studio.schema';
import { StudioService } from '@/models/studio/studio.service';

describe('backdoorStudioController', () => {
  let controller: BackdoorStudioController;

  const mockStudioService = {
    createStudio: jest.fn(),
    updateStudio: jest.fn(),
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
      controllers: [BackdoorStudioController],
      providers: [
        { provide: StudioService, useValue: mockStudioService },
        { provide: ConfigService, useValue: mockConfigService },
        BackdoorApiKeyGuard,
      ],
    }).compile();

    controller = module.get<BackdoorStudioController>(BackdoorStudioController);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createStudio', () => {
    it('should create a studio', async () => {
      const createDto: CreateStudioDto = {
        name: 'Test Studio',
        address: '123 Test St',
        metadata: {},
      } as CreateStudioDto;
      const createdStudio = { uid: 'std_123', ...createDto };

      mockStudioService.createStudio.mockResolvedValue(createdStudio as any);

      const result = await controller.createStudio(createDto);

      expect(mockStudioService.createStudio).toHaveBeenCalledWith(createDto);
      expect(result).toEqual(createdStudio);
    });
  });

  describe('updateStudio', () => {
    it('should update a studio', async () => {
      const studioId = 'std_123';
      const updateDto: UpdateStudioDto = {
        name: 'Updated Studio Name',
      } as UpdateStudioDto;
      const updatedStudio = {
        uid: studioId,
        name: 'Updated Studio Name',
        address: '123 Test St',
      };

      mockStudioService.updateStudio.mockResolvedValue(updatedStudio as any);

      const result = await controller.updateStudio(studioId, updateDto);

      expect(mockStudioService.updateStudio).toHaveBeenCalledWith(
        studioId,
        updateDto,
      );
      expect(result).toEqual(updatedStudio);
    });
  });
});
