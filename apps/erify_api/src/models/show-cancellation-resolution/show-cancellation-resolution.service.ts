import { Injectable } from '@nestjs/common';

import type {
  CreatePendingShowCancellationResolutionPayload,
  ResolveShowCancellationResolutionPayload,
} from './schemas/show-cancellation-resolution.schema';
import { ShowCancellationResolutionRepository } from './show-cancellation-resolution.repository';
import { SHOW_CANCELLATION_RESOLUTION_UID_PREFIX } from './show-cancellation-resolution-uid.util';

import { BaseModelService } from '@/lib/services/base-model.service';
import { UtilityService } from '@/utility/utility.service';

@Injectable()
export class ShowCancellationResolutionService extends BaseModelService {
  static readonly UID_PREFIX = SHOW_CANCELLATION_RESOLUTION_UID_PREFIX;
  protected readonly uidPrefix = ShowCancellationResolutionService.UID_PREFIX;

  constructor(
    private readonly showCancellationResolutionRepository: ShowCancellationResolutionRepository,
    protected readonly utilityService: UtilityService,
  ) {
    super(utilityService);
  }

  async createPendingResolution(payload: CreatePendingShowCancellationResolutionPayload) {
    return this.showCancellationResolutionRepository.createPending({
      uid: this.generateUid(),
      show: { connect: { id: payload.showId } },
      reasonCategory: payload.reasonCategory,
      reasonNote: payload.reasonNote ?? null,
      resolutionOwnerMembership: {
        connect: { id: payload.resolutionOwnerMembershipId },
      },
      followUpDueAt: payload.followUpDueAt ?? null,
      followUpNotes: payload.followUpNotes ?? null,
      finalDisposition: null,
      resolutionNotes: null,
      resolvedAt: null,
      ...(payload.createdById != null && {
        createdBy: { connect: { id: payload.createdById } },
      }),
    });
  }

  async findPendingResolutionForShow(showId: bigint) {
    return this.showCancellationResolutionRepository.findPendingForShow(showId);
  }

  async resolvePendingResolution(
    uid: string,
    payload: ResolveShowCancellationResolutionPayload,
  ) {
    return this.showCancellationResolutionRepository.resolvePending(uid, {
      finalDisposition: payload.finalDisposition,
      resolutionNotes: payload.resolutionNotes,
      resolvedAt: new Date(),
      ...(payload.resolvedById != null && {
        resolvedBy: { connect: { id: payload.resolvedById } },
      }),
    });
  }
}
