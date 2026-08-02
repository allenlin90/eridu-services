import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import type {
  CreateShowIssuePayload,
  EscalateShowIssuePayload,
  ListShowIssuesFilters,
  ResolveShowIssuePayload,
  ShowIssueWithRelations,
  UpdateShowIssueFieldsPayload,
} from './schemas/show-issue.schema';
import { ShowIssueRepository } from './show-issue.repository';
import { SHOW_ISSUE_UID_PREFIX } from './show-issue-uid.util';

import { HttpError } from '@/lib/errors/http-error.util';
import { PRISMA_ERROR } from '@/lib/errors/prisma-error-codes';
import { VersionConflictError } from '@/lib/errors/version-conflict.error';
import { BaseModelService } from '@/lib/services/base-model.service';
import { UidGeneratorService } from '@/lib/uid/uid-generator.service';

@Injectable()
export class ShowIssueService extends BaseModelService {
  static readonly UID_PREFIX = SHOW_ISSUE_UID_PREFIX;
  protected readonly uidPrefix = ShowIssueService.UID_PREFIX;

  constructor(
    private readonly showIssueRepository: ShowIssueRepository,
    protected readonly uidGenerator: UidGeneratorService,
  ) {
    super(uidGenerator);
  }

  async createShowIssue(payload: CreateShowIssuePayload): Promise<ShowIssueWithRelations> {
    this.assertOriginSourceArc(payload.origin, payload.showCreatorId, payload.showPlatformViolationId);

    const uid = this.generateUid();
    const data: Prisma.ShowIssueCreateInput = {
      uid,
      show: { connect: { id: payload.showId } },
      category: payload.category,
      origin: payload.origin,
      severity: payload.severity,
      title: payload.title,
      evidence: payload.evidence ?? undefined,
      dueAt: payload.dueAt ?? undefined,
      owner: payload.ownerId ? { connect: { id: payload.ownerId } } : undefined,
      createdBy: payload.createdById ? { connect: { id: payload.createdById } } : undefined,
      showCreator: payload.showCreatorId ? { connect: { id: payload.showCreatorId } } : undefined,
      showPlatformViolation: payload.showPlatformViolationId
        ? { connect: { id: payload.showPlatformViolationId } }
        : undefined,
    };

    try {
      return await this.showIssueRepository.create(data);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === PRISMA_ERROR.UniqueConstraint) {
        throw HttpError.conflict('An issue already exists for this creator, category, and origin.');
      }
      throw error;
    }
  }

  async getShowIssueByUid(uid: string): Promise<ShowIssueWithRelations | null> {
    return this.showIssueRepository.findByUid(uid);
  }

  async getShowIssueByUidAndStudio(uid: string, studioUid: string): Promise<ShowIssueWithRelations | null> {
    return this.showIssueRepository.findByUidAndStudio(uid, studioUid);
  }

  /**
   * Reconciliation identity lookup for creator-sourced automated issues
   * (`origin: 'FACT_EXTRACTION'` only — the unique constraint is keyed on
   * `(showCreatorId, category, origin)`, so a MANUAL issue can never occupy
   * this identity). Used by `ShowIssueReconciliationService`.
   */
  async findActiveAutomatedIssueByShowCreator(
    showCreatorId: bigint,
    category: string,
  ): Promise<ShowIssueWithRelations | null> {
    return this.showIssueRepository.findActiveByShowCreatorCategoryOrigin(
      showCreatorId,
      category,
      'FACT_EXTRACTION',
    );
  }

  /**
   * Reconciliation identity lookup for platform-violation-sourced automated
   * issues, keyed 1:1 by the unique `showPlatformViolationId` FK. Used by
   * `ShowIssueReconciliationService`.
   */
  async findActiveAutomatedIssueByShowPlatformViolation(
    showPlatformViolationId: bigint,
  ): Promise<ShowIssueWithRelations | null> {
    return this.showIssueRepository.findActiveByShowPlatformViolationId(showPlatformViolationId);
  }

  async listShowIssues(
    filters: ListShowIssuesFilters,
    opts: { skip?: number; take?: number },
  ): Promise<{ data: ShowIssueWithRelations[]; total: number }> {
    return this.showIssueRepository.findPaginated(filters, opts);
  }

  /**
   * Generic field edit. `payload.status` is accepted only as the "start"
   * transition (`IN_PROGRESS`) — see `updateShowIssueInputSchema`'s comment
   * for why resolve/reopen are separate commands.
   *
   * `expectedVersion` is the caller-supplied optimistic-lock token (what the
   * client last read), NOT `current.version` — `current` may have been
   * re-fetched fresh from the DB by the caller for authorization/state
   * checks, and using its version instead of the client's would make a
   * stale-version write silently succeed instead of 409ing.
   */
  async updateShowIssueFields(
    current: ShowIssueWithRelations,
    expectedVersion: number,
    payload: UpdateShowIssueFieldsPayload,
  ): Promise<ShowIssueWithRelations> {
    if (payload.status !== undefined) {
      if (current.status === 'RESOLVED') {
        throw HttpError.badRequest('Cannot start a resolved issue; reopen it first.');
      }
      if (current.status !== 'OPEN') {
        throw HttpError.badRequest('Issue is already in progress.');
      }
    }

    if (payload.category !== undefined && current.origin === 'FACT_EXTRACTION') {
      throw HttpError.badRequest('Category cannot be changed for an automated issue — it is part of the reconciliation identity.');
    }

    const data: Prisma.ShowIssueUpdateInput = {};
    if (payload.category !== undefined)
      data.category = payload.category;
    if (payload.severity !== undefined)
      data.severity = payload.severity;
    if (payload.status !== undefined)
      data.status = payload.status;
    if (payload.title !== undefined)
      data.title = payload.title;
    if (payload.evidence !== undefined)
      data.evidence = payload.evidence;
    if (payload.dueAt !== undefined)
      data.dueAt = payload.dueAt;
    if (payload.ownerId !== undefined) {
      data.owner = payload.ownerId ? { connect: { id: payload.ownerId } } : { disconnect: true };
    }

    return this.persistVersionedUpdate(current.uid, expectedVersion, data);
  }

  /** See `updateShowIssueFields` doc comment for why `expectedVersion` is a separate parameter from `current`. */
  async resolveShowIssue(
    current: ShowIssueWithRelations,
    expectedVersion: number,
    payload: ResolveShowIssuePayload,
  ): Promise<ShowIssueWithRelations> {
    if (current.status === 'RESOLVED') {
      throw HttpError.badRequest('Issue is already resolved.');
    }

    const data: Prisma.ShowIssueUpdateInput = {
      status: 'RESOLVED',
      resolvedAt: new Date(),
      resolvedBy: payload.resolvedById ? { connect: { id: payload.resolvedById } } : { disconnect: true },
      resolutionCode: payload.resolutionCode,
      resolutionNote: payload.resolutionNote,
    };

    return this.persistVersionedUpdate(current.uid, expectedVersion, data);
  }

  /**
   * Reopen clears the previous resolution fields and returns the issue to
   * OPEN. See `updateShowIssueFields` doc comment for why `expectedVersion`
   * is a separate parameter from `current`.
   */
  async reopenShowIssue(current: ShowIssueWithRelations, expectedVersion: number): Promise<ShowIssueWithRelations> {
    if (current.status !== 'RESOLVED') {
      throw HttpError.badRequest('Only a resolved issue can be reopened.');
    }

    const data: Prisma.ShowIssueUpdateInput = {
      status: 'OPEN',
      resolvedAt: null,
      resolvedBy: { disconnect: true },
      resolutionCode: null,
      resolutionNote: null,
    };

    return this.persistVersionedUpdate(current.uid, expectedVersion, data);
  }

  /** See `updateShowIssueFields` doc comment for why `expectedVersion` is a separate parameter from `current`. */
  async escalateShowIssue(
    current: ShowIssueWithRelations,
    expectedVersion: number,
    payload: EscalateShowIssuePayload,
  ): Promise<ShowIssueWithRelations> {
    if (current.status === 'RESOLVED') {
      throw HttpError.badRequest('Cannot escalate a resolved issue.');
    }

    const data: Prisma.ShowIssueUpdateInput = {
      escalationLevel: { increment: 1 },
      escalatedAt: new Date(),
      escalatedBy: payload.escalatedById ? { connect: { id: payload.escalatedById } } : { disconnect: true },
      escalationNote: payload.escalationNote ?? undefined,
    };

    return this.persistVersionedUpdate(current.uid, expectedVersion, data);
  }

  /**
   * Structural validation of the origin/source exclusive arc (design doc
   * §Proposed model): FACT_EXTRACTION requires exactly one typed automated
   * source; MANUAL requires neither. Cross-model "the typed source belongs
   * to the same show" validation is intentionally NOT performed here — it is
   * the responsibility of the (not-yet-built) reconciliation workflow, which
   * already holds the source row it looked up and is the only caller that
   * can ever set `origin: 'FACT_EXTRACTION'`.
   */
  private assertOriginSourceArc(
    origin: string,
    showCreatorId?: bigint | null,
    showPlatformViolationId?: bigint | null,
  ): void {
    const sourceCount = [showCreatorId, showPlatformViolationId].filter((value) => value != null).length;

    if (origin === 'FACT_EXTRACTION' && sourceCount !== 1) {
      throw HttpError.badRequest('FACT_EXTRACTION issues require exactly one typed automated source.');
    }
    if (origin === 'MANUAL' && sourceCount !== 0) {
      throw HttpError.badRequest('MANUAL issues must not set an automated source.');
    }
  }

  private async persistVersionedUpdate(
    uid: string,
    expectedVersion: number,
    data: Prisma.ShowIssueUpdateInput,
  ): Promise<ShowIssueWithRelations> {
    try {
      return await this.showIssueRepository.updateWithVersionCheck(
        { uid, version: expectedVersion },
        { ...data, version: expectedVersion + 1 },
      );
    } catch (error) {
      if (error instanceof VersionConflictError) {
        throw HttpError.conflict('Show issue is out of date. Please refresh and try again.');
      }
      throw error;
    }
  }
}
