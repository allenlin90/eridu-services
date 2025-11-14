import { Test, TestingModule } from '@nestjs/testing';

import { PaginationQueryDto } from '@/common/pagination/schema/pagination.schema';
import {
  CreateShowStatusDto,
  UpdateShowStatusDto,
} from '@/models/show-status/schemas/show-status.schema';
import { ShowStatusService } from '@/models/show-status/show-status.service';
import { UtilityService } from '@/utility/utility.service';

import { AdminShowStatusController } from './admin-show-status.controller';

describe('AdminShowStatusController', () => {
  let controller: AdminShowStatusController;

  const mockShowStatusService = {
    createShowStatus: jest.fn(),
    getShowStatuses: jest.fn(),
    countShowStatuses: jest.fn(),
    getShowStatusById: jest.fn(),
    updateShowStatus: jest.fn(),
    deleteShowStatus: jest.fn(),
  };

  const mockUtilityService = {
    createPaginationMeta: jest.fn(),
    generateBrandedId: jest.fn(),
    isTimeOverlapping: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminShowStatusController],
      providers: [
        { provide: ShowStatusService, useValue: mockShowStatusService },
        { provide: UtilityService, useValue: mockUtilityService },
      ],
    }).compile();

    controller = module.get<AdminShowStatusController>(
      AdminShowStatusController,
    );
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createShowStatus', () => {
    it('should create a show status', async () => {
      const createDto: CreateShowStatusDto = {
        name: 'Active',
        metadata: {},
      } as CreateShowStatusDto;
      const createdStatus = { uid: 'show_status_123', ...createDto };

      mockShowStatusService.createShowStatus.mockResolvedValue(
        createdStatus as any,
      );

      const result = await controller.createShowStatus(createDto);

      expect(mockShowStatusService.createShowStatus).toHaveBeenCalledWith(
        createDto,
      );
      expect(result).toEqual(createdStatus);
    });
  });

  describe('getShowStatuses', () => {
    it('should return paginated list of show statuses', async () => {
      const query: PaginationQueryDto = {
        page: 1,
        limit: 10,
        skip: 0,
        take: 10,
      };
      const statuses = [
        { uid: 'show_status_1', name: 'Active' },
        { uid: 'show_status_2', name: 'Inactive' },
      ];
      const total = 2;
      const paginationMeta = {
        page: 1,
        limit: 10,
        total: 2,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false,
      };

      mockShowStatusService.getShowStatuses.mockResolvedValue(statuses as any);
      mockShowStatusService.countShowStatuses.mockResolvedValue(total);
      mockUtilityService.createPaginationMeta.mockReturnValue(paginationMeta);

      const result = await controller.getShowStatuses(query);

      expect(mockShowStatusService.getShowStatuses).toHaveBeenCalledWith({
        skip: query.skip,
        take: query.take,
      });
      expect(mockShowStatusService.countShowStatuses).toHaveBeenCalled();
      expect(mockUtilityService.createPaginationMeta).toHaveBeenCalledWith(
        query.page,
        query.limit,
        total,
      );
      expect(result).toEqual({
        data: statuses,
        meta: paginationMeta,
      });
    });
  });

  describe('getShowStatus', () => {
    it('should return a show status by id', async () => {
      const statusId = 'show_status_123';
      const status = { uid: statusId, name: 'Active' };

      mockShowStatusService.getShowStatusById.mockResolvedValue(status as any);

      const result = await controller.getShowStatus(statusId);

      expect(mockShowStatusService.getShowStatusById).toHaveBeenCalledWith(
        statusId,
      );
      expect(result).toEqual(status);
    });
  });

  describe('updateShowStatus', () => {
    it('should update a show status', async () => {
      const statusId = 'show_status_123';
      const updateDto: UpdateShowStatusDto = {
        name: 'Updated Status',
      } as UpdateShowStatusDto;
      const updatedStatus = { uid: statusId, ...updateDto };

      mockShowStatusService.updateShowStatus.mockResolvedValue(
        updatedStatus as any,
      );

      const result = await controller.updateShowStatus(statusId, updateDto);

      expect(mockShowStatusService.updateShowStatus).toHaveBeenCalledWith(
        statusId,
        updateDto,
      );
      expect(result).toEqual(updatedStatus);
    });
  });

  describe('deleteShowStatus', () => {
    it('should delete a show status', async () => {
      const statusId = 'show_status_123';

      mockShowStatusService.deleteShowStatus.mockResolvedValue(undefined);

      await controller.deleteShowStatus(statusId);

      expect(mockShowStatusService.deleteShowStatus).toHaveBeenCalledWith(
        statusId,
      );
    });
  });
});
