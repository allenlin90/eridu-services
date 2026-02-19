import type { CreateClientDto, UpdateClientDto } from './schemas/client.schema';
import { ClientRepository } from './client.repository';
import { ClientService } from './client.service';

import {
  createMockRepository,
  createMockUtilityService,
  createModelServiceTestModule,
  setupTestMocks,
} from '@/testing/model-service-test.helper';
import { createMockUniqueConstraintError } from '@/testing/prisma-error.helper';
import type { UtilityService } from '@/utility/utility.service';

jest.mock('nanoid', () => ({ nanoid: () => 'test_id' }));

describe('clientService', () => {
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
      utilityMock,
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

  it('getClientByUid returns null if not found', async () => {
    (clientRepositoryMock.findByUid as jest.Mock).mockResolvedValue(null);

    const result = await service.getClientByUid('client_404');
    expect(result).toBeNull();
  });

  it('updateClient calls repository update', async () => {
    (clientRepositoryMock.update as jest.Mock).mockResolvedValue({
      uid: 'client_1',
      name: 'Acme',
    });

    const result = await service.updateClient('client_1', {
      name: 'Acme',
    } as UpdateClientDto);

    expect(clientRepositoryMock.update).toHaveBeenCalledWith(
      { uid: 'client_1' },
      { name: 'Acme' },
    );
    expect(result).toEqual({ uid: 'client_1', name: 'Acme' });
  });
});
