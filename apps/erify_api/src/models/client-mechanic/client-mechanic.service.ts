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
import { UtilityService } from '@/utility/utility.service';

type MechanicScope = {
  mechanicUid: string;
  clientUid: string;
};

function metadataMatches(
  payloadMetadata: Record<string, any> | undefined,
  existingMetadata: unknown,
) {
  return payloadMetadata === undefined
    || JSON.stringify(payloadMetadata) === JSON.stringify(existingMetadata ?? {});
}

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
    protected readonly utilityService: UtilityService,
  ) {
    super(utilityService);
  }

  /**
   * Creates a mechanic for a client. The owning client is assumed validated by
   * the controller. Authorship history is not denormalized on the row; trace
   * it via the Audit model if a future flow needs it.
   */
  async createMechanic(
    clientUid: string,
    payload: CreateClientMechanicPayload,
  ): ReturnType<ClientMechanicRepository['create']> {
    return this.clientMechanicRepository.create(
      {
        uid: this.generateUid(),
        title: payload.title,
        instructionLabel: payload.instructionLabel,
        instructionBody: payload.instructionBody,
        metadata: payload.metadata ?? {},
        client: { connect: { uid: clientUid } },
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

    const data = {
      ...(payload.title !== undefined && payload.title !== existing.title && { title: payload.title }),
      ...(payload.instructionLabel !== undefined
        && payload.instructionLabel !== existing.instructionLabel
        && { instructionLabel: payload.instructionLabel }),
      ...(payload.instructionBody !== undefined
        && payload.instructionBody !== existing.instructionBody
        && { instructionBody: payload.instructionBody }),
      ...(payload.status !== undefined && payload.status !== existing.status && { status: payload.status }),
      ...(!metadataMatches(payload.metadata, existing.metadata) && { metadata: payload.metadata }),
    };

    if (Object.keys(data).length === 0) {
      return existing;
    }

    const contentChanged = data.instructionLabel !== undefined || data.instructionBody !== undefined;
    const updateData = {
      ...data,
      version: existing.version + 1,
      ...(contentChanged && { contentRevision: existing.contentRevision + 1 }),
    };

    try {
      return await this.clientMechanicRepository.updateWithVersionCheck(
        { uid: scope.mechanicUid, clientUid: scope.clientUid, version: payload.version },
        updateData,
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
   * `null` for not-found; throws 409 when a concurrent edit raced the retire.
   * Hard-delete is intentionally not exposed — mechanics are kept for
   * coverage/history once referenced.
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

    // Guard the retire with the just-read `version`. DELETE carries no client
    // version (unlike the PATCH status='retired' path), so without this guard a
    // content edit landing between the read and the write would be lost and the
    // `version` counter would collide. Surfacing the race as a 409 keeps the
    // optimistic-lock invariant intact; the rare retry re-reads and succeeds.
    try {
      return await this.clientMechanicRepository.updateWithVersionCheck(
        { uid: scope.mechanicUid, clientUid: scope.clientUid, version: existing.version },
        { status: 'retired', version: existing.version + 1 },
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
}
