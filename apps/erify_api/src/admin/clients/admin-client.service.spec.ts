import { Test, TestingModule } from '@nestjs/testing';

import { ClientService } from '../../client/client.service';
import { CreateClientDto } from '../../client/schemas/client.schema';
import { UtilityService } from '../../utility/utility.service';
import { AdminClientService } from './admin-client.service';

jest.mock('nanoid', () => ({ nanoid: () => 'test_id' }));

describe('AdminClientService', () => {
  let service: AdminClientService;

  const clientServiceMock: Partial<jest.Mocked<ClientService>> = {
    createClient: jest.fn(),
    getClientById: jest.fn(),
    updateClient: jest.fn(),
    deleteClient: jest.fn(),
    getClients: jest.fn(),
    countClients: jest.fn(),
  };

  const utilityServiceMock: Partial<jest.Mocked<UtilityService>> = {
    createPaginationMeta: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminClientService,
        { provide: ClientService, useValue: clientServiceMock },
        { provide: UtilityService, useValue: utilityServiceMock },
      ],
    }).compile();

    service = module.get<AdminClientService>(AdminClientService);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('createClient delegates to clientService', async () => {
    const dto = { name: 'Acme' } as CreateClientDto;
    const created = { uid: 'client_1' } as const;
    (clientServiceMock.createClient as jest.Mock).mockResolvedValue(created);

    const result = await service.createClient(dto);

    expect(clientServiceMock.createClient as jest.Mock).toHaveBeenCalledWith(
      dto,
    );
    expect(result).toEqual(created);
  });

  it('getClients returns paginated with meta', async () => {
    (clientServiceMock.getClients as jest.Mock).mockResolvedValue([
      { uid: 'client_1' },
    ]);
    (clientServiceMock.countClients as jest.Mock).mockResolvedValue(1);
    (utilityServiceMock.createPaginationMeta as jest.Mock).mockReturnValue({
      page: 1,
      limit: 10,
      total: 1,
      totalPages: 1,
      hasNextPage: false,
      hasPreviousPage: false,
    });

    const result = await service.getClients({
      page: 1,
      limit: 10,
      skip: 0,
      take: 10,
    });

    expect(
      utilityServiceMock.createPaginationMeta as jest.Mock,
    ).toHaveBeenCalledWith(1, 10, 1);
    expect(result.data.length).toBe(1);
    expect(result.meta.total).toBe(1);
  });
});
