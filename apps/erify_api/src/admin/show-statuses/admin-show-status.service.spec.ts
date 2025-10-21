/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';

import { UpdateShowStatusDto } from '../../show-status/schemas/show-status.schema';
import { ShowStatusService } from '../../show-status/show-status.service';
import { UtilityService } from '../../utility/utility.service';
import { AdminShowStatusService } from './admin-show-status.service';

jest.mock('nanoid', () => ({ nanoid: () => 'test_id' }));

describe('AdminShowStatusService', () => {
  let service: AdminShowStatusService;
  let showStatusService: ShowStatusService;
  let utilityService: UtilityService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminShowStatusService,
        {
          provide: ShowStatusService,
          useValue: {
            createShowStatus: jest.fn(),
            getShowStatusById: jest.fn(),
            updateShowStatus: jest.fn(),
            deleteShowStatus: jest.fn(),
            getShowStatuses: jest.fn(),
            countShowStatuses: jest.fn(),
          },
        },
        {
          provide: UtilityService,
          useValue: {
            createPaginationMeta: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AdminShowStatusService>(AdminShowStatusService);
    showStatusService = module.get<ShowStatusService>(ShowStatusService);
    utilityService = module.get<UtilityService>(UtilityService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createShowStatus', () => {
    it('should call showStatusService.createShowStatus with correct data', async () => {
      const createShowStatusDto = {
        name: 'Draft',
        metadata: { description: 'Show is in draft status' },
      };

      const expectedResult = {
        id: 1n,
        uid: 'shs_00000001',
        name: 'Draft',
        metadata: { description: 'Show is in draft status' },
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      jest
        .spyOn(showStatusService, 'createShowStatus')
        .mockResolvedValue(expectedResult);

      const result = await service.createShowStatus(createShowStatusDto);

      expect(showStatusService.createShowStatus).toHaveBeenCalledWith({
        name: createShowStatusDto.name,
        metadata: createShowStatusDto.metadata,
      });
      expect(result).toEqual(expectedResult);
    });
  });

  describe('getShowStatusById', () => {
    it('should call showStatusService.getShowStatusById with correct uid', async () => {
      const uid = 'shs_00000001';
      const expectedResult = {
        id: 1n,
        uid,
        name: 'Draft',
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      jest
        .spyOn(showStatusService, 'getShowStatusById')
        .mockResolvedValue(expectedResult);

      const result = await service.getShowStatusById(uid);

      expect(showStatusService.getShowStatusById).toHaveBeenCalledWith(uid);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('updateShowStatus', () => {
    it('should call showStatusService.updateShowStatus with correct uid and data', async () => {
      const uid = 'shs_00000001';
      const updateShowStatusDto: Partial<UpdateShowStatusDto> = {
        name: 'Confirmed',
        metadata: { description: 'Show is confirmed' },
      };

      const expectedResult = {
        id: 1n,
        uid,
        name: 'Confirmed',
        metadata: { description: 'Show is confirmed' },
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      jest
        .spyOn(showStatusService, 'updateShowStatus')
        .mockResolvedValue(expectedResult);

      const result = await service.updateShowStatus(
        uid,
        updateShowStatusDto as UpdateShowStatusDto,
      );

      expect(showStatusService.updateShowStatus).toHaveBeenCalledWith(
        uid,
        updateShowStatusDto,
      );
      expect(result).toEqual(expectedResult);
    });
  });

  describe('deleteShowStatus', () => {
    it('should call showStatusService.deleteShowStatus with correct uid', async () => {
      const uid = 'shs_00000001';
      const expectedResult = {
        id: 1n,
        uid,
        name: 'Draft',
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: new Date(),
      };

      jest
        .spyOn(showStatusService, 'deleteShowStatus')
        .mockResolvedValue(expectedResult);

      const result = await service.deleteShowStatus(uid);

      expect(showStatusService.deleteShowStatus).toHaveBeenCalledWith(uid);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('getShowStatuses', () => {
    it('should return paginated show statuses', async () => {
      const params = {
        page: 1,
        limit: 10,
        skip: 0,
        take: 10,
      };

      const showStatuses = [
        {
          id: 1n,
          uid: 'shs_00000001',
          name: 'Draft',
          metadata: {},
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null,
        },
        {
          id: 2n,
          uid: 'shs_00000002',
          name: 'Confirmed',
          metadata: {},
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null,
        },
        {
          id: 3n,
          uid: 'shs_00000003',
          name: 'Live',
          metadata: {},
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null,
        },
      ];

      const meta = {
        page: 1,
        limit: 10,
        total: 3,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false,
      };

      jest
        .spyOn(showStatusService, 'getShowStatuses')
        .mockResolvedValue(showStatuses);
      jest.spyOn(showStatusService, 'countShowStatuses').mockResolvedValue(3);
      jest.spyOn(utilityService, 'createPaginationMeta').mockReturnValue(meta);

      const result = await service.getShowStatuses(params);

      expect(showStatusService.getShowStatuses).toHaveBeenCalledWith({
        skip: 0,
        take: 10,
      });
      expect(showStatusService.countShowStatuses).toHaveBeenCalled();
      expect(utilityService.createPaginationMeta).toHaveBeenCalledWith(
        1,
        10,
        3,
      );
      expect(result).toEqual({ data: showStatuses, meta });
    });

    it('should handle pagination with multiple pages', async () => {
      const params = {
        page: 2,
        limit: 5,
        skip: 5,
        take: 5,
      };

      const showStatuses = [
        {
          id: 6n,
          uid: 'shs_00000006',
          name: 'Completed',
          metadata: {},
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null,
        },
      ];

      const meta = {
        page: 2,
        limit: 5,
        total: 8,
        totalPages: 2,
        hasNextPage: false,
        hasPreviousPage: true,
      };

      jest
        .spyOn(showStatusService, 'getShowStatuses')
        .mockResolvedValue(showStatuses);
      jest.spyOn(showStatusService, 'countShowStatuses').mockResolvedValue(8);
      jest.spyOn(utilityService, 'createPaginationMeta').mockReturnValue(meta);

      const result = await service.getShowStatuses(params);

      expect(showStatusService.getShowStatuses).toHaveBeenCalledWith({
        skip: 5,
        take: 5,
      });
      expect(showStatusService.countShowStatuses).toHaveBeenCalled();
      expect(utilityService.createPaginationMeta).toHaveBeenCalledWith(2, 5, 8);
      expect(result).toEqual({ data: showStatuses, meta });
    });

    it('should handle empty results', async () => {
      const params = {
        page: 1,
        limit: 10,
        skip: 0,
        take: 10,
      };

      const showStatuses: any[] = [];
      const meta = {
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 0,
        hasNextPage: false,
        hasPreviousPage: false,
      };

      jest
        .spyOn(showStatusService, 'getShowStatuses')
        .mockResolvedValue(showStatuses);
      jest.spyOn(showStatusService, 'countShowStatuses').mockResolvedValue(0);
      jest.spyOn(utilityService, 'createPaginationMeta').mockReturnValue(meta);

      const result = await service.getShowStatuses(params);

      expect(showStatusService.getShowStatuses).toHaveBeenCalledWith({
        skip: 0,
        take: 10,
      });
      expect(showStatusService.countShowStatuses).toHaveBeenCalled();
      expect(utilityService.createPaginationMeta).toHaveBeenCalledWith(
        1,
        10,
        0,
      );
      expect(result).toEqual({ data: showStatuses, meta });
    });
  });
});
