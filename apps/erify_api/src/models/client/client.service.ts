import { Injectable } from '@nestjs/common';

import type {
  CreateClientPayload,
  UpdateClientPayload,
} from './schemas/client.schema';
import { ClientRepository } from './client.repository';

import { BaseModelService } from '@/lib/services/base-model.service';
import { UtilityService } from '@/utility/utility.service';

/**
 * Service for managing Client entities.
 */
@Injectable()
export class ClientService extends BaseModelService {
  static readonly UID_PREFIX = 'client';
  protected readonly uidPrefix = ClientService.UID_PREFIX;

  constructor(
    private readonly clientRepository: ClientRepository,
    protected readonly utilityService: UtilityService,
  ) {
    super(utilityService);
  }

  /**
   * Creates a new client.
   */
  createClient(
    payload: CreateClientPayload,
  ): ReturnType<ClientRepository['create']> {
    const uid = this.generateUid();
    return this.clientRepository.create({ ...payload, uid });
  }

  /**
   * Retrieves a client by UID.
   */
  getClientByUid(
    ...args: Parameters<ClientRepository['findByUid']>
  ): ReturnType<ClientRepository['findByUid']> {
    return this.clientRepository.findByUid(...args);
  }

  /**
   * Retrieves a client by internal ID.
   */
  findClientById(
    ...args: Parameters<ClientRepository['findOne']>
  ): ReturnType<ClientRepository['findOne']> {
    return this.clientRepository.findOne(...args);
  }

  /**
   * Lists clients with pagination and filtering.
   */
  listClients(
    ...args: Parameters<ClientRepository['findPaginated']>
  ): ReturnType<ClientRepository['findPaginated']> {
    return this.clientRepository.findPaginated(...args);
  }

  /**
   * Counts clients matching criteria.
   */
  countClients(
    ...args: Parameters<ClientRepository['count']>
  ): ReturnType<ClientRepository['count']> {
    return this.clientRepository.count(...args);
  }

  /**
   * Updates a client.
   */
  updateClient(
    uid: string,
    payload: UpdateClientPayload,
  ): ReturnType<ClientRepository['update']> {
    return this.clientRepository.update({ uid }, payload);
  }

  /**
   * Soft deletes a client.
   */
  deleteClient(
    uid: string,
  ): ReturnType<ClientRepository['softDelete']> {
    return this.clientRepository.softDelete({ uid });
  }
}
