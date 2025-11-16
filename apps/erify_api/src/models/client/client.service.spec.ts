import {
  createMockRepository,
  createMockUtilityService,
  createModelServiceTestModule,
  setupTestMocks,
} from '@/common/test-helpers/model-service-test.helper';
import { createMockUniqueConstraintError } from '@/common/test-helpers/prisma-error.helper';
import { UtilityService } from '@/utility/utility.service';

import { ClientRepository } from './client.repository';
import { ClientService } from './client.service';
import { CreateClientDto, UpdateClientDto } from './schemas/client.schema';

jest.mock('nanoid', () => ({ nanoid: () => 'test_id' }));

describe('ClientService', () => {
  let service: ClientService;
  let clientRepositoryMock: Partial<jest.Mocked<ClientRepository>>;
  let utilityMock: Partial<jest.Mocked<UtilityService>>;

  beforeEach(async () => {
    clientRepositoryMock = createMockRepository<ClientRepository>();
    utilityMock = createMockUtilityService('client_123');

    const module = await createModelServiceTestModule({
      serviceClass: ClientService,
      repositoryClass: ClientRepository,
      repositoryMock: clientRepositoryMock,
      utilityMock: utilityMock,
    });

    service = module.get<ClientService>(ClientService);
  });

  beforeEach(() => {
    setupTestMocks();
  });

  it('createClient returns created client', async () => {
    const dto: CreateClientDto = {
      name: 'Acme',
      contactPerson: 'Jane',
      contactEmail: 'jane@acme.com',
      metadata: {},
    } as CreateClientDto;
    const created = { uid: 'client_123', ...dto } as const;
    (clientRepositoryMock.create as jest.Mock).mockResolvedValue(created);

    const result = await service.createClient(dto);

    expect(utilityMock.generateBrandedId).toHaveBeenCalledWith(
      'client',
      undefined,
    );
    expect(clientRepositoryMock.create).toHaveBeenCalled();
    expect(result).toEqual(created);
  });

  it('createClient maps P2002 to Conflict', async () => {
    const dto: CreateClientDto = {
      name: 'Acme',
      contactPerson: 'Jane',
      contactEmail: 'jane@acme.com',
      metadata: {},
    } as CreateClientDto;
    const error = createMockUniqueConstraintError(['email']);
    (clientRepositoryMock.create as jest.Mock).mockRejectedValue(error);

    await expect(service.createClient(dto)).rejects.toThrow(error);
  });

  it('getClientById throws not found', async () => {
    (clientRepositoryMock.findByUid as jest.Mock).mockResolvedValue(null);

    await expect(service.getClientById('client_404')).rejects.toMatchObject({
      status: 404,
    });
  });

  it('updateClient maps P2002 to Conflict', async () => {
    (clientRepositoryMock.findByUid as jest.Mock).mockResolvedValue({
      uid: 'client_1',
      name: 'OldName',
    });
    const error = createMockUniqueConstraintError(['name']);
    (clientRepositoryMock.update as jest.Mock).mockRejectedValue(error);

    await expect(
      service.updateClient('client_1', { name: 'Acme' } as UpdateClientDto),
    ).rejects.toThrow(error);
  });
});
