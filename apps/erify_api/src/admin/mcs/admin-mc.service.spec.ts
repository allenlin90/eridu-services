import { Test, TestingModule } from '@nestjs/testing';

import { McService } from '../../mc/mc.service';
import { CreateMcDto, UpdateMcDto } from '../../mc/schemas/mc.schema';
import { UserService } from '../../user/user.service';
import { UtilityService } from '../../utility/utility.service';
import { AdminMcService } from './admin-mc.service';

jest.mock('nanoid', () => ({ nanoid: () => 'test_id' }));

describe('AdminMcService', () => {
  let service: AdminMcService;

  const mcServiceMock: Partial<jest.Mocked<McService>> = {
    createMc: jest.fn(),
    getMcById: jest.fn(),
    updateMc: jest.fn(),
    deleteMc: jest.fn(),
    getMcs: jest.fn(),
    countMcs: jest.fn(),
  };

  const userServiceMock: Partial<jest.Mocked<UserService>> = {
    getUserById: jest.fn(),
    findUserById: jest.fn(),
  };

  const utilityServiceMock: Partial<jest.Mocked<UtilityService>> = {
    createPaginationMeta: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminMcService,
        { provide: McService, useValue: mcServiceMock },
        { provide: UserService, useValue: userServiceMock },
        { provide: UtilityService, useValue: utilityServiceMock },
      ],
    }).compile();

    service = module.get<AdminMcService>(AdminMcService);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createMc', () => {
    it('creates MC without userId', async () => {
      const dto = { name: 'MC A', aliasName: 'mc-a' } as CreateMcDto;
      const created = {
        uid: 'mc_1',
        name: 'MC A',
        aliasName: 'mc-a',
        userId: null,
        user: null,
      } as const;
      (mcServiceMock.createMc as jest.Mock).mockResolvedValue(created);

      const result = await service.createMc(dto);

      expect(mcServiceMock.createMc as jest.Mock).toHaveBeenCalledWith(
        {
          ...dto,
          userId: null,
        },
        { user: true },
      );
      expect(result).toEqual(created);
    });

    it('creates MC with valid userId', async () => {
      const dto = {
        name: 'MC A',
        aliasName: 'mc-a',
        userId: 'user_123',
      } as CreateMcDto;
      const user = { id: 1n, uid: 'user_123', name: 'Test User' } as const;
      const created = {
        uid: 'mc_1',
        name: 'MC A',
        aliasName: 'mc-a',
        userId: 1n,
        user: {
          id: 1n,
          uid: 'user_123',
          name: 'Test User',
        },
      } as const;

      (userServiceMock.findUserById as jest.Mock).mockResolvedValue(user);
      (mcServiceMock.createMc as jest.Mock).mockResolvedValue(created);

      const result = await service.createMc(dto);

      expect(userServiceMock.findUserById as jest.Mock).toHaveBeenCalledWith(
        'user_123',
      );
      expect(mcServiceMock.createMc as jest.Mock).toHaveBeenCalledWith(
        {
          ...dto,
          userId: 1n,
        },
        { user: true },
      );
      expect(result).toEqual(created);
    });

    it('throws error when userId is invalid', async () => {
      const dto = {
        name: 'MC A',
        aliasName: 'mc-a',
        userId: 'user_invalid',
      } as CreateMcDto;
      (userServiceMock.findUserById as jest.Mock).mockResolvedValue(null);

      await expect(service.createMc(dto)).rejects.toThrow(
        'user_id: user_invalid not found',
      );
      expect(userServiceMock.findUserById as jest.Mock).toHaveBeenCalledWith(
        'user_invalid',
      );
      expect(mcServiceMock.createMc as jest.Mock).not.toHaveBeenCalled();
    });
  });

  describe('getMcById', () => {
    it('returns MC with user information when user exists', async () => {
      const mcWithUser = {
        uid: 'mc_1',
        name: 'MC A',
        aliasName: 'mc-a',
        userId: 1n,
        user: {
          id: 1n,
          uid: 'user_123',
          name: 'Test User',
        },
      } as const;

      (mcServiceMock.getMcById as jest.Mock).mockResolvedValue(mcWithUser);

      const result = await service.getMcById('mc_1');

      expect(mcServiceMock.getMcById as jest.Mock).toHaveBeenCalledWith(
        'mc_1',
        { user: true },
      );
      expect(result).toEqual(mcWithUser);
    });

    it('returns MC with null userId when no user is associated', async () => {
      const mcWithoutUser = {
        uid: 'mc_1',
        name: 'MC A',
        aliasName: 'mc-a',
        userId: null,
        user: null,
      } as const;
      (mcServiceMock.getMcById as jest.Mock).mockResolvedValue(mcWithoutUser);

      const result = await service.getMcById('mc_1');

      expect(mcServiceMock.getMcById as jest.Mock).toHaveBeenCalledWith(
        'mc_1',
        { user: true },
      );
      expect(result).toEqual(mcWithoutUser);
    });

    it('throws error when MC is not found', async () => {
      const error = new Error('MC not found');
      (mcServiceMock.getMcById as jest.Mock).mockRejectedValue(error);

      await expect(service.getMcById('mc_invalid')).rejects.toThrow(
        'MC not found',
      );
      expect(mcServiceMock.getMcById as jest.Mock).toHaveBeenCalledWith(
        'mc_invalid',
        { user: true },
      );
    });
  });

  describe('updateMc', () => {
    it('updates MC without userId', async () => {
      const dto: Partial<UpdateMcDto> = {
        name: 'Updated MC',
        aliasName: 'updated-mc',
      };
      const updated = {
        uid: 'mc_1',
        name: 'Updated MC',
        aliasName: 'updated-mc',
        userId: null,
        user: null,
      } as const;

      (mcServiceMock.updateMc as jest.Mock).mockResolvedValue(updated);

      const result = await service.updateMc('mc_1', dto as UpdateMcDto);

      expect(mcServiceMock.updateMc as jest.Mock).toHaveBeenCalledWith(
        'mc_1',
        dto,
        { user: true },
      );
      expect(result).toEqual(updated);
    });

    it('updates MC with valid userId', async () => {
      const dto: Partial<UpdateMcDto> = {
        name: 'Updated MC',
        aliasName: 'updated-mc',
        userId: 'user_456',
      };
      const user = { id: 2n, uid: 'user_456', name: 'Updated User' } as const;
      const updated = {
        uid: 'mc_1',
        name: 'Updated MC',
        aliasName: 'updated-mc',
        userId: 2n,
        user: {
          id: 2n,
          uid: 'user_456',
          name: 'Updated User',
        },
      } as const;

      (userServiceMock.findUserById as jest.Mock).mockResolvedValue(user);
      (mcServiceMock.updateMc as jest.Mock).mockResolvedValue(updated);

      const result = await service.updateMc('mc_1', dto as UpdateMcDto);

      expect(userServiceMock.findUserById as jest.Mock).toHaveBeenCalledWith(
        'user_456',
      );
      expect(mcServiceMock.updateMc as jest.Mock).toHaveBeenCalledWith(
        'mc_1',
        {
          name: 'Updated MC',
          aliasName: 'updated-mc',
          user: { connect: { id: 2n } },
        },
        { user: true },
      );
      expect(result).toEqual(updated);
    });

    it('throws error when userId is invalid', async () => {
      const dto: Partial<UpdateMcDto> = {
        name: 'Updated MC',
        aliasName: 'updated-mc',
        userId: 'user_invalid',
      };
      (userServiceMock.findUserById as jest.Mock).mockResolvedValue(null);

      await expect(
        service.updateMc('mc_1', dto as UpdateMcDto),
      ).rejects.toThrow('user_id: user_invalid not found');
      expect(userServiceMock.findUserById as jest.Mock).toHaveBeenCalledWith(
        'user_invalid',
      );
      expect(mcServiceMock.updateMc as jest.Mock).not.toHaveBeenCalled();
    });

    it('throws error when MC is not found', async () => {
      const dto: Partial<UpdateMcDto> = { name: 'Updated MC' };
      const error = new Error('MC not found');
      (mcServiceMock.updateMc as jest.Mock).mockRejectedValue(error);

      await expect(
        service.updateMc('mc_invalid', dto as UpdateMcDto),
      ).rejects.toThrow('MC not found');
      expect(mcServiceMock.updateMc as jest.Mock).toHaveBeenCalledWith(
        'mc_invalid',
        dto,
        { user: true },
      );
    });
  });

  describe('deleteMc', () => {
    it('deletes MC successfully', async () => {
      const deleted = {
        uid: 'mc_1',
        name: 'MC A',
        aliasName: 'mc-a',
        userId: null,
      } as const;

      (mcServiceMock.deleteMc as jest.Mock).mockResolvedValue(deleted);

      const result = await service.deleteMc('mc_1');

      expect(mcServiceMock.deleteMc as jest.Mock).toHaveBeenCalledWith('mc_1');
      expect(result).toEqual(deleted);
    });

    it('throws error when MC is not found', async () => {
      const error = new Error('MC not found');
      (mcServiceMock.deleteMc as jest.Mock).mockRejectedValue(error);

      await expect(service.deleteMc('mc_invalid')).rejects.toThrow(
        'MC not found',
      );
      expect(mcServiceMock.deleteMc as jest.Mock).toHaveBeenCalledWith(
        'mc_invalid',
      );
    });
  });

  describe('getMcs', () => {
    it('returns paginated MCs with user information', async () => {
      const mcsWithUsers = [
        {
          uid: 'mc_1',
          name: 'MC A',
          aliasName: 'mc-a',
          userId: 1n,
          user: {
            id: 1n,
            uid: 'user_123',
            name: 'Test User',
          },
        },
        {
          uid: 'mc_2',
          name: 'MC B',
          aliasName: 'mc-b',
          userId: null,
          user: null,
        },
      ] as const;

      (mcServiceMock.getMcs as jest.Mock).mockResolvedValue(mcsWithUsers);
      (mcServiceMock.countMcs as jest.Mock).mockResolvedValue(2);
      (utilityServiceMock.createPaginationMeta as jest.Mock).mockReturnValue({
        page: 1,
        limit: 10,
        total: 2,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false,
      });

      const result = await service.getMcs({
        page: 1,
        limit: 10,
        skip: 0,
        take: 10,
      });

      expect(mcServiceMock.getMcs as jest.Mock).toHaveBeenCalledWith(
        { skip: 0, take: 10 },
        { user: true },
      );
      expect(mcServiceMock.countMcs as jest.Mock).toHaveBeenCalledWith();
      expect(
        utilityServiceMock.createPaginationMeta as jest.Mock,
      ).toHaveBeenCalledWith(1, 10, 2);

      expect(result.data).toHaveLength(2);
      expect(result.data[0]).toEqual(mcsWithUsers[0]);
      expect(result.data[1]).toEqual(mcsWithUsers[1]);

      expect(result.meta).toEqual({
        page: 1,
        limit: 10,
        total: 2,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false,
      });
    });

    it('returns empty data when no MCs exist', async () => {
      (mcServiceMock.getMcs as jest.Mock).mockResolvedValue([]);
      (mcServiceMock.countMcs as jest.Mock).mockResolvedValue(0);
      (utilityServiceMock.createPaginationMeta as jest.Mock).mockReturnValue({
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 0,
        hasNextPage: false,
        hasPreviousPage: false,
      });

      const result = await service.getMcs({
        page: 1,
        limit: 10,
        skip: 0,
        take: 10,
      });

      expect(result.data).toHaveLength(0);
      expect(result.meta.total).toBe(0);
      expect(result.meta.totalPages).toBe(0);
    });

    it('calculates pagination meta correctly for multiple pages', async () => {
      (mcServiceMock.getMcs as jest.Mock).mockResolvedValue([]);
      (mcServiceMock.countMcs as jest.Mock).mockResolvedValue(25);
      (utilityServiceMock.createPaginationMeta as jest.Mock).mockReturnValue({
        page: 2,
        limit: 10,
        total: 25,
        totalPages: 3,
        hasNextPage: true,
        hasPreviousPage: true,
      });

      const result = await service.getMcs({
        page: 2,
        limit: 10,
        skip: 10,
        take: 10,
      });

      expect(
        utilityServiceMock.createPaginationMeta as jest.Mock,
      ).toHaveBeenCalledWith(2, 10, 25);
      expect(result.meta).toEqual({
        page: 2,
        limit: 10,
        total: 25,
        totalPages: 3,
        hasNextPage: true,
        hasPreviousPage: true,
      });
    });
  });
});
