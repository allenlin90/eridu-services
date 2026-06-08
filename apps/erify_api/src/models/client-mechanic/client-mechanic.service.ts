import { Injectable } from '@nestjs/common';

import type {
  CreateClientMechanicPayload,
  UpdateClientMechanicPayload,
} from './schemas/client-mechanic.schema';
import {
  clientMechanicDefaultInclude,
  ClientMechanicRepository,
} from './client-mechanic.repository';

import { HttpError } from '@/lib/errors/http-error.util';
import { VersionConflictError } from '@/lib/errors/version-conflict.error';
import { BaseModelService } from '@/lib/services/base-model.service';
import { UserService } from '@/models/user/user.service';
import { UtilityService } from '@/utility/utility.service';

type MechanicScope = {
  mechanicUid: string;
  clientUid: string;
};

/**
 * Service for managing ClientMechanic entities — client-owned reusable
 * moderation instructions assignable into task-template loops.
 */
@Injectable()
export class ClientMechanicService extends BaseModelService {
  static readonly UID_PREFIX = 'cmech';
  protected readonly uidPrefix = ClientMechanicService.UID_PREFIX;

  constructor(
    private readonly clientMechanicRepository: ClientMechanicRepository,
    private readonly userService: UserService,
    protected readonly utilityService: UtilityService,
  ) {
    super(utilityService);
  }

  /**
   * Creates a mechanic for a client. The owning client is assumed validated by
   * the controller; `actorExtId` records the authoring user.
   */
  async createMechanic(
    clientUid: string,
    payload: CreateClientMechanicPayload,
    actorExtId: string,
  ): ReturnType<ClientMechanicRepository['create']> {
    const actor = await this.userService.getUserByExtId(actorExtId);

    return this.clientMechanicRepository.create(
      {
        uid: this.generateUid(),
        title: payload.title,
        instructionLabel: payload.instructionLabel,
        instructionBody: payload.instructionBody,
        metadata: payload.metadata ?? {},
        client: { connect: { uid: clientUid } },
        ...(actor && { createdByUser: { connect: { id: actor.id } } }),
      },
      clientMechanicDefaultInclude,
    );
  }

  /**
   * Reads a client-scoped mechanic by UID. Returns `null` for not-found so the
   * controller can map to a 404.
   */
  getMechanic(scope: MechanicScope) {
    return this.clientMechanicRepository.findByUidForClient({
      uid: scope.mechanicUid,
      clientUid: scope.clientUid,
    });
  }

  /**
   * Lists a client's mechanics with pagination, status filter, and search.
   */
  listMechanics(
    ...args: Parameters<ClientMechanicRepository['findPaginated']>
  ): ReturnType<ClientMechanicRepository['findPaginated']> {
    return this.clientMechanicRepository.findPaginated(...args);
  }

  /**
   * Updates a mechanic's content / status. Bumps the optimistic-lock `version`
   * on every change and the monotonic `contentRevision` only when the
   * moderator-facing instruction (label or body) actually changes. Returns
   * `null` for not-found; throws 409 on stale `version`.
   */
  async updateMechanic(scope: MechanicScope, payload: UpdateClientMechanicPayload) {
    const existing = await this.clientMechanicRepository.findByUidForClient({
      uid: scope.mechanicUid,
      clientUid: scope.clientUid,
    });

    if (!existing) {
      return null;
    }

    const contentChanged
      = (payload.instructionLabel !== undefined && payload.instructionLabel !== existing.instructionLabel)
      || (payload.instructionBody !== undefined && payload.instructionBody !== existing.instructionBody);

    const data = {
      ...(payload.title !== undefined && { title: payload.title }),
      ...(payload.instructionLabel !== undefined && { instructionLabel: payload.instructionLabel }),
      ...(payload.instructionBody !== undefined && { instructionBody: payload.instructionBody }),
      ...(payload.status !== undefined && { status: payload.status }),
      ...(payload.metadata !== undefined && { metadata: payload.metadata }),
      version: existing.version + 1,
      ...(contentChanged && { contentRevision: existing.contentRevision + 1 }),
    };

    try {
      return await this.clientMechanicRepository.updateWithVersionCheck(
        { uid: scope.mechanicUid, clientUid: scope.clientUid, version: payload.version },
        data,
      );
    } catch (error) {
      if (error instanceof VersionConflictError) {
        throw HttpError.conflict(
          'Client mechanic record is out of date. Please refresh your record and try again.',
        );
      }
      throw error;
    }
  }

  /**
   * Retires a mechanic (soft, reversible lifecycle). Idempotent: retiring an
   * already-retired mechanic is a no-op that still returns the row. Returns
   * `null` for not-found. Hard-delete is intentionally not exposed — mechanics
   * are kept for coverage/history once referenced.
   */
  async retireMechanic(scope: MechanicScope) {
    const existing = await this.clientMechanicRepository.findByUidForClient({
      uid: scope.mechanicUid,
      clientUid: scope.clientUid,
    });

    if (!existing) {
      return null;
    }

    if (existing.status === 'retired') {
      return existing;
    }

    return this.clientMechanicRepository.update(
      { uid: scope.mechanicUid, client: { uid: scope.clientUid } },
      { status: 'retired', version: existing.version + 1 },
      clientMechanicDefaultInclude,
    );
  }
}
