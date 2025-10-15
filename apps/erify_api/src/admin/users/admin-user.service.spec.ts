import { Test, TestingModule } from '@nestjs/testing';

import { CreateUserDto } from '../../user/schemas/user.schema';
import { UserService } from '../../user/user.service';
import { AdminUserService } from './admin-user.service';

jest.mock('nanoid', () => ({ nanoid: () => 'test_id' }));

describe('AdminUserService', () => {
  let service: AdminUserService;

  const userServiceMock: Partial<jest.Mocked<UserService>> = {
    createUser: jest.fn(),
    getUserById: jest.fn(),
    updateUser: jest.fn(),
    deleteUser: jest.fn(),
    getUsers: jest.fn(),
    countUsers: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminUserService,
        { provide: UserService, useValue: userServiceMock },
      ],
    }).compile();

    service = module.get<AdminUserService>(AdminUserService);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('createUser delegates to userService', async () => {
    const dto = { email: 'a@b.com' } as CreateUserDto;
    const created = { uid: 'user_1' } as const;
    (userServiceMock.createUser as jest.Mock).mockResolvedValue(created);

    const result = await service.createUser(dto);

    expect(userServiceMock.createUser as jest.Mock).toHaveBeenCalledWith(dto);
    expect(result).toEqual(created);
  });

  it('getUsers returns paginated with meta', async () => {
    (userServiceMock.getUsers as jest.Mock).mockResolvedValue([
      { uid: 'user_1' },
    ]);
    (userServiceMock.countUsers as jest.Mock).mockResolvedValue(1);

    const result = await service.getUsers({
      page: 1,
      limit: 10,
      skip: 0,
      take: 10,
    });

    expect(result.data.length).toBe(1);
    expect(result.meta.total).toBe(1);
  });
});
