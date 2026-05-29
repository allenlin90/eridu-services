import { Injectable } from '@nestjs/common';

import type {
  AuditTargetFilter,
  AuditWithTargets,
  CreateAuditPayload,
} from './schemas/audit.schema';
import { AuditRepository } from './audit.repository';

import { HttpError } from '@/lib/errors/http-error.util';
import { BaseModelService } from '@/lib/services/base-model.service';
import { UtilityService } from '@/utility/utility.service';

@Injectable()
export class AuditService extends BaseModelService {
  static readonly UID_PREFIX = 'aud';
  protected readonly uidPrefix = AuditService.UID_PREFIX;

  constructor(
    private readonly auditRepository: AuditRepository,
    protected readonly utilityService: UtilityService,
  ) {
    super(utilityService);
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
    if (payload.action !== 'SIGN_OFF' && (!payload.targets || payload.targets.length === 0)) {
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

  async findSignOff(
    studioUid: string,
    dateFrom: string,
    dateTo: string,
  ) {
    return this.auditRepository.findSignOff(studioUid, dateFrom, dateTo);
  }

  async lockSignOffRange(
    studioUid: string,
    dateFrom: string,
    dateTo: string,
  ): Promise<void> {
    return this.auditRepository.lockSignOffRange(studioUid, dateFrom, dateTo);
  }
}
