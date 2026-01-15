import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';

import { AdminClientController } from './admin-client.controller';

import { ClientService } from '@/models/client/client.service';
import type {
  CreateClientDto,
  ListClientsQueryDto,
  UpdateClientDto,
} from '@/models/client/schemas/client.schema';

describe('adminClientController', () => {
  let controller: AdminClientController;

  const mockClientService = {
    createClient: jest.fn(),
    getClients: jest.fn(),
    countClients: jest.fn(),
    getClientById: jest.fn(),
    updateClient: jest.fn(),
    deleteClient: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminClientController],
      providers: [{ provide: ClientService, useValue: mockClientService }],
    }).compile();

    controller = module.get<AdminClientController>(AdminClientController);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createClient', () => {
    it('should create a client', async () => {
      const createDto: CreateClientDto = {
        name: 'Test Client',
        metadata: {},
      } as CreateClientDto;
      const createdClient = { uid: 'client_123', ...createDto };

      mockClientService.createClient.mockResolvedValue(createdClient as any);

      const result = await controller.createClient(createDto);

      expect(mockClientService.createClient).toHaveBeenCalledWith(createDto);
      expect(result).toEqual(createdClient);
    });
  });

  describe('getClients', () => {
    it('should return paginated list of clients', async () => {
      const query: ListClientsQueryDto = {
        page: 1,
        limit: 10,
        skip: 0,
        take: 10,
        name: 'test',
        include_deleted: false,
      };
      const clients = [
        { uid: 'client_1', name: 'Client 1' },
        { uid: 'client_2', name: 'Client 2' },
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

      mockClientService.getClients.mockResolvedValue(clients as any);
      mockClientService.countClients.mockResolvedValue(total);

      const result = await controller.getClients(query);

      expect(mockClientService.getClients).toHaveBeenCalledWith({
        skip: query.skip,
        take: query.take,
        name: query.name,
        include_deleted: query.include_deleted,
      });
      expect(mockClientService.countClients).toHaveBeenCalled();
      expect(result).toEqual({
        data: clients,
        meta: paginationMeta,
      });
    });
  });

  describe('getClient', () => {
    it('should return a client by id', async () => {
      const clientId = 'client_123';
      const client = { uid: clientId, name: 'Test Client' };

      mockClientService.getClientById.mockResolvedValue(client as any);

      const result = await controller.getClient(clientId);

      expect(mockClientService.getClientById).toHaveBeenCalledWith(clientId);
      expect(result).toEqual(client);
    });
  });

  describe('updateClient', () => {
    it('should update a client', async () => {
      const clientId = 'client_123';
      const updateDto: UpdateClientDto = {
        name: 'Updated Client',
      } as UpdateClientDto;
      const updatedClient = { uid: clientId, ...updateDto };

      mockClientService.updateClient.mockResolvedValue(updatedClient as any);

      const result = await controller.updateClient(clientId, updateDto);

      expect(mockClientService.updateClient).toHaveBeenCalledWith(
        clientId,
        updateDto,
      );
      expect(result).toEqual(updatedClient);
    });
  });

  describe('deleteClient', () => {
    it('should delete a client', async () => {
      const clientId = 'client_123';

      mockClientService.deleteClient.mockResolvedValue(undefined);

      await controller.deleteClient(clientId);

      expect(mockClientService.deleteClient).toHaveBeenCalledWith(clientId);
    });
  });
});
