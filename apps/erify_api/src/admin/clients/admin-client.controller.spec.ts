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
    listClients: jest.fn(),
    getClients: jest.fn(),
    countClients: jest.fn(),
    getClientByUid: jest.fn(),
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

      expect(mockClientService.createClient).toHaveBeenCalledWith({
        name: createDto.name,
        contactPerson: (createDto as any).contact_person, // Handle DTO translation if mapping exists
        contactEmail: (createDto as any).contact_email,
        metadata: createDto.metadata,
      });
      // Actually the controller extracts: const { name, contactPerson, contactEmail, metadata } = body;
      // In CreateClientDto, name is name.
      // Wait, let's look at the controller code:
      /*
      const { name, contactPerson, contactEmail, metadata } = body;
      return this.clientService.createClient({
        name,
        contactPerson,
        contactEmail,
        metadata,
      });
      */
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
        uid: undefined,
        sort: 'desc',
      } as any;
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

      mockClientService.listClients.mockResolvedValue({
        data: clients,
        total,
      } as any);

      const result = await controller.getClients(query);

      expect(mockClientService.listClients).toHaveBeenCalledWith(query);
      expect(result).toEqual({
        data: clients,
        meta: paginationMeta,
      });
    });
  });

  describe('getClient', () => {
    it('should return a client by uid', async () => {
      const clientId = 'client_123';
      const client = { uid: clientId, name: 'Test Client' };

      mockClientService.getClientByUid.mockResolvedValue(client as any);

      const result = await controller.getClient(clientId);

      expect(mockClientService.getClientByUid).toHaveBeenCalledWith(clientId);
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

      mockClientService.getClientByUid.mockResolvedValue({ uid: clientId } as any);
      mockClientService.updateClient.mockResolvedValue(updatedClient as any);

      const result = await controller.updateClient(clientId, updateDto);

      expect(mockClientService.getClientByUid).toHaveBeenCalledWith(clientId);
      expect(mockClientService.updateClient).toHaveBeenCalledWith(
        clientId,
        expect.any(Object),
      );
      expect(result).toEqual(updatedClient);
    });
  });

  describe('deleteClient', () => {
    it('should delete a client', async () => {
      const clientId = 'client_123';

      mockClientService.getClientByUid.mockResolvedValue({ uid: clientId } as any);
      mockClientService.deleteClient.mockResolvedValue(undefined);

      await controller.deleteClient(clientId);

      expect(mockClientService.getClientByUid).toHaveBeenCalledWith(clientId);
      expect(mockClientService.deleteClient).toHaveBeenCalledWith(clientId);
    });
  });
});
