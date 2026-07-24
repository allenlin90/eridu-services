import { Injectable } from '@nestjs/common';

import type {
  AuditTargetFilter,
  AuditWithTargets,
  CreateAuditPayload,
} from './schemas/audit.schema';
import type { SchedulePublishImpactAuditTarget, SchedulePublishImpactQueryFilters } from './audit.repository';
import { AuditRepository } from './audit.repository';

import { HttpError } from '@/lib/errors/http-error.util';
import { BaseModelService } from '@/lib/services/base-model.service';
import { UidGeneratorService } from '@/lib/uid/uid-generator.service';

@Injectable()
export class AuditService extends BaseModelService {
  static readonly UID_PREFIX = 'aud';
  protected readonly uidPrefix = AuditService.UID_PREFIX;

  constructor(
    private readonly auditRepository: AuditRepository,
    protected readonly uidGenerator: UidGeneratorService,
  ) {
    super(uidGenerator);
  }

  /**
   * Persists an `Audit` envelope plus one or more `AuditTarget` rows in a
   * single nested write. Generates the audit UID when the caller omits it.
   *
   * Callers in downstream PRs:
   * - 12.0.5 extraction pipeline (engine writes, `actorId = null`)
   * - manager-override controllers (request-bound actor)
   */
  async create(
    payload: Omit<CreateAuditPayload, 'uid'> & { uid?: string },
  ): Promise<AuditWithTargets> {
    if (!payload.targets || payload.targets.length === 0) {
      throw HttpError.badRequest('Audit requires at least one target');
    }

    return this.auditRepository.create({
      ...payload,
      uid: payload.uid ?? this.generateUid(),
    });
  }

  async findByUid(uid: string): Promise<AuditWithTargets | null> {
    return this.auditRepository.findByUid(uid);
  }

  async findForTargets(
    filters: AuditTargetFilter[],
    opts?: { take?: number; skip?: number },
  ): Promise<AuditWithTargets[]> {
    return this.auditRepository.findForTargets(filters, opts);
  }

  async countForTargets(filters: AuditTargetFilter[]): Promise<number> {
    return this.auditRepository.countForTargets(filters);
  }

  async findSchedulePublishImpactsForStudio(
    studioUid: string,
    opts: SchedulePublishImpactQueryFilters & {
      take: number;
      skip: number;
    },
  ): Promise<{ items: SchedulePublishImpactAuditTarget[]; total: number }> {
    return this.auditRepository.findSchedulePublishImpactsForStudio(studioUid, opts);
  }

  async countSchedulePublishImpactsForStudio(
    studioUid: string,
    filters: SchedulePublishImpactQueryFilters,
  ): Promise<number> {
    return this.auditRepository.countSchedulePublishImpactsForStudio(studioUid, filters);
  }

  async findLatestScheduleConflictForShow(showId: bigint): Promise<AuditWithTargets | null> {
    return this.auditRepository.findLatestScheduleConflictForShow(showId);
  }

  async findPendingStaleConflictsForStudio(
    studioUid: string,
    opts: SchedulePublishImpactQueryFilters & { take: number; skip: number },
  ): Promise<{ items: SchedulePublishImpactAuditTarget[]; total: number }> {
    return this.auditRepository.findPendingStaleConflictsForStudio(studioUid, opts);
  }

  async countPendingStaleConflictsForStudio(
    studioUid: string,
    filters: SchedulePublishImpactQueryFilters,
  ): Promise<number> {
    return this.auditRepository.countPendingStaleConflictsForStudio(studioUid, filters);
  }

  async findResolvedStaleConflictsForStudio(
    studioUid: string,
    opts: SchedulePublishImpactQueryFilters & { outcomes?: string[]; take: number; skip: number },
  ): Promise<{ items: SchedulePublishImpactAuditTarget[]; total: number }> {
    return this.auditRepository.findResolvedStaleConflictsForStudio(studioUid, opts);
  }

  async countResolvedStaleConflictsForStudio(
    studioUid: string,
    filters: SchedulePublishImpactQueryFilters & { outcomes?: string[] },
  ): Promise<number> {
    return this.auditRepository.countResolvedStaleConflictsForStudio(studioUid, filters);
  }
}
