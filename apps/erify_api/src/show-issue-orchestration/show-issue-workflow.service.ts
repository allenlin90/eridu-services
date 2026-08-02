import { Injectable } from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';

import type { AuditTargetType } from '@eridu/api-types/audits';
import { STUDIO_ROLE } from '@eridu/api-types/memberships';

import { HttpError } from '@/lib/errors/http-error.util';
import { AuditService } from '@/models/audit/audit.service';
import { StudioMembershipService } from '@/models/membership/studio-membership.service';
import { ShowService } from '@/models/show/show.service';
import type {
  CreateShowIssueDto,
  EscalateShowIssueDto,
  ListShowIssuesQueryDto,
  ReopenShowIssueDto,
  ResolveShowIssueDto,
  ShowIssueApiResponse,
  ShowIssueWithRelations,
  UpdateShowIssueDto,
} from '@/models/show-issue/schemas/show-issue.schema';
import { toShowIssueApiResponse } from '@/models/show-issue/schemas/show-issue.schema';
import { ShowIssueService } from '@/models/show-issue/show-issue.service';
import { UserService } from '@/models/user/user.service';

type Actor = { id: bigint; uid: string; name: string };

const PRIVILEGED_ROLES: readonly string[] = [STUDIO_ROLE.ADMIN, STUDIO_ROLE.MANAGER];

/**
 * Manual show-issue workflow: authorization, optimistic locking, and audit
 * coverage on top of `ShowIssueService`'s single-model persistence. Composes
 * `ShowIssueService`, `StudioMembershipService`, and `AuditService` — see
 * the "Module Boundary" section of
 * docs/design/SHOW_ISSUE_OWNERSHIP_DESIGN.md.
 *
 * Automated reconciliation lives in the sibling `ShowIssueReconciliationService`;
 * this service only ever writes `origin: 'MANUAL'` issues and validates
 * that automated fields stay immutable through every public method here.
 */
@Injectable()
export class ShowIssueWorkflowService {
  constructor(
    private readonly showIssueService: ShowIssueService,
    private readonly showService: ShowService,
    private readonly studioMembershipService: StudioMembershipService,
    private readonly userService: UserService,
    private readonly auditService: AuditService,
  ) {}

  async listShowIssues(
    studioUid: string,
    query: ListShowIssuesQueryDto,
  ): Promise<{ items: ShowIssueApiResponse[]; total: number }> {
    const { data, total } = await this.showIssueService.listShowIssues(
      {
        studioUid,
        showUid: query.show_id,
        ownerUid: query.owner_id,
        status: query.status,
        severity: query.severity,
        category: query.category,
        origin: query.origin,
        dateFrom: query.date_from ? new Date(query.date_from) : undefined,
        dateTo: query.date_to ? new Date(query.date_to) : undefined,
        search: query.search,
      },
      { skip: query.skip, take: query.take },
    );

    return { items: data.map(toShowIssueApiResponse), total };
  }

  async getShowIssue(studioUid: string, issueUid: string): Promise<ShowIssueApiResponse> {
    const issue = await this.requireIssue(studioUid, issueUid);
    return toShowIssueApiResponse(issue);
  }

  async getShowIssueAudits(
    studioUid: string,
    issueUid: string,
    opts: { skip?: number; take?: number },
  ) {
    const issue = await this.requireIssue(studioUid, issueUid);
    const filters = [{ targetType: 'SHOW_ISSUE' as const, targetId: issue.id }];

    const [total, items] = await Promise.all([
      this.auditService.countForTargets(filters),
      this.auditService.findForTargets(filters, opts),
    ]);

    return {
      total,
      items: items.map((item) => ({
        id: item.uid,
        action: item.action,
        actor_uid: item.actor?.uid ?? null,
        ip_address: item.ipAddress ?? null,
        user_agent: item.userAgent ?? null,
        reason: item.reason ?? null,
        metadata: item.metadata,
        targets: item.targets.map((t) => ({
          target_type: t.targetType as AuditTargetType,
          target_uid: t.targetType === 'SHOW_ISSUE' ? (t.showIssue?.uid ?? issue.uid) : '',
        })),
        created_at: item.createdAt.toISOString(),
      })),
    };
  }

  @Transactional()
  async createShowIssue(
    studioUid: string,
    dto: CreateShowIssueDto,
    actorExtId: string,
  ): Promise<ShowIssueApiResponse> {
    const actor = await this.requireActor(actorExtId);
    const show = await this.requireShow(studioUid, dto.showId);
    const ownerId = dto.ownerId ? await this.resolveActiveOwner(studioUid, dto.ownerId) : null;

    const created = await this.showIssueService.createShowIssue({
      showId: show.id,
      category: dto.category,
      origin: 'MANUAL',
      severity: dto.severity,
      title: dto.title,
      evidence: dto.evidence ?? null,
      ownerId,
      dueAt: dto.dueAt ?? null,
      createdById: actor.id,
    });

    await this.writeAudit({
      issueId: created.id,
      actor,
      action: 'CREATE',
      operation: 'issue_created',
      changes: {
        category: created.category,
        severity: created.severity,
        title: created.title,
        owner_uid: created.owner?.uid ?? null,
        due_at: created.dueAt?.toISOString() ?? null,
      },
    });

    return toShowIssueApiResponse(created);
  }

  /**
   * Generic field edit. Admin/Manager may edit any field on any issue,
   * including setting `status: 'IN_PROGRESS'` (the "start" transition). The
   * assigned active member may ONLY set `status: 'IN_PROGRESS'` on their own
   * issue — any other field in the same payload, or acting on someone else's
   * issue, is forbidden (design doc authorization matrix: "Edit
   * assignment/severity/due/evidence" = No for the assigned member).
   */
  @Transactional()
  async updateShowIssue(
    studioUid: string,
    issueUid: string,
    dto: UpdateShowIssueDto,
    actorExtId: string,
    studioRole: string | undefined,
  ): Promise<ShowIssueApiResponse> {
    const actor = await this.requireActor(actorExtId);
    const issue = await this.requireIssue(studioUid, issueUid);
    const isPrivileged = this.isPrivileged(studioRole);

    const nonStatusFieldsProvided = [dto.category, dto.severity, dto.title, dto.evidence, dto.ownerId, dto.dueAt]
      .some((value) => value !== undefined);

    if (!isPrivileged) {
      const isOwnIssue = issue.owner?.uid === actor.uid;
      const isStartOnly = dto.status === 'IN_PROGRESS' && !nonStatusFieldsProvided;
      if (!isOwnIssue || !isStartOnly) {
        throw HttpError.forbidden(
          'Only a Studio Admin/Manager may edit this issue; the assigned member may only start their own issue.',
        );
      }
    }

    const ownerId = dto.ownerId !== undefined
      ? (dto.ownerId ? await this.resolveActiveOwner(studioUid, dto.ownerId) : null)
      : undefined;

    // Semantic no-op guard: a field can be "provided" (passes the schema's
    // at-least-one-field refine) while carrying the value the issue already
    // has — e.g. a resubmitted form. Skip the write and the audit row rather
    // than bumping `version` and recording an empty-looking `issue_updated`
    // entry for a mutation nothing actually observed.
    const hasRealChange = dto.status !== undefined
      || (dto.category !== undefined && dto.category !== issue.category)
      || (dto.severity !== undefined && dto.severity !== issue.severity)
      || (dto.title !== undefined && dto.title !== issue.title)
      || (dto.evidence !== undefined && dto.evidence !== issue.evidence)
      || (dto.dueAt !== undefined && (dto.dueAt?.getTime() ?? null) !== (issue.dueAt?.getTime() ?? null))
      || (ownerId !== undefined && ownerId !== (issue.ownerId ?? null));

    if (!hasRealChange) {
      return toShowIssueApiResponse(issue);
    }

    const updated = await this.showIssueService.updateShowIssueFields(issue, dto.version, {
      category: dto.category,
      severity: dto.severity,
      status: dto.status,
      title: dto.title,
      evidence: dto.evidence,
      dueAt: dto.dueAt,
      ownerId,
    });

    await this.writeAudit({
      issueId: updated.id,
      actor,
      action: 'UPDATE',
      operation: 'issue_updated',
      changes: {
        ...(dto.category !== undefined && { category: dto.category }),
        ...(dto.severity !== undefined && { severity: dto.severity }),
        ...(dto.status !== undefined && { status: dto.status }),
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.evidence !== undefined && { evidence: dto.evidence }),
        ...(dto.dueAt !== undefined && { due_at: dto.dueAt?.toISOString() ?? null }),
        ...(dto.ownerId !== undefined && { owner_uid: updated.owner?.uid ?? null }),
      },
    });

    return toShowIssueApiResponse(updated);
  }

  /** Admin/Manager may resolve any issue; the assigned member may resolve their own. */
  @Transactional()
  async resolveShowIssue(
    studioUid: string,
    issueUid: string,
    dto: ResolveShowIssueDto,
    actorExtId: string,
    studioRole: string | undefined,
  ): Promise<ShowIssueApiResponse> {
    const actor = await this.requireActor(actorExtId);
    const issue = await this.requireIssue(studioUid, issueUid);

    if (!this.isPrivileged(studioRole) && issue.owner?.uid !== actor.uid) {
      throw HttpError.forbidden(
        'Only a Studio Admin/Manager or the assigned member may resolve this issue.',
      );
    }

    const resolved = await this.showIssueService.resolveShowIssue(issue, dto.version, {
      resolvedById: actor.id,
      resolutionCode: dto.resolutionCode,
      resolutionNote: dto.resolutionNote,
    });

    await this.writeAudit({
      issueId: resolved.id,
      actor,
      action: 'UPDATE',
      operation: 'issue_resolved',
      reason: dto.resolutionNote,
      changes: { resolution_code: dto.resolutionCode },
    });

    return toShowIssueApiResponse(resolved);
  }

  /** Admin/Manager only — the assigned member cannot reopen (authorization matrix). */
  @Transactional()
  async reopenShowIssue(
    studioUid: string,
    issueUid: string,
    dto: ReopenShowIssueDto,
    actorExtId: string,
  ): Promise<ShowIssueApiResponse> {
    const actor = await this.requireActor(actorExtId);
    const issue = await this.requireIssue(studioUid, issueUid);

    const reopened = await this.showIssueService.reopenShowIssue(issue, dto.version);

    await this.writeAudit({
      issueId: reopened.id,
      actor,
      action: 'UPDATE',
      operation: 'issue_reopened',
      reason: dto.reason ?? null,
      changes: { previous_resolution_code: issue.resolutionCode ?? null },
    });

    return toShowIssueApiResponse(reopened);
  }

  /** Admin/Manager only — the assigned member cannot escalate (authorization matrix). */
  @Transactional()
  async escalateShowIssue(
    studioUid: string,
    issueUid: string,
    dto: EscalateShowIssueDto,
    actorExtId: string,
  ): Promise<ShowIssueApiResponse> {
    const actor = await this.requireActor(actorExtId);
    const issue = await this.requireIssue(studioUid, issueUid);

    const escalated = await this.showIssueService.escalateShowIssue(issue, dto.version, {
      escalatedById: actor.id,
      escalationNote: dto.escalationNote ?? null,
    });

    await this.writeAudit({
      issueId: escalated.id,
      actor,
      action: 'UPDATE',
      operation: 'issue_escalated',
      reason: dto.escalationNote ?? null,
      changes: { escalation_level: escalated.escalationLevel },
    });

    return toShowIssueApiResponse(escalated);
  }

  private isPrivileged(studioRole: string | undefined): boolean {
    return studioRole !== undefined && PRIVILEGED_ROLES.includes(studioRole);
  }

  private async requireActor(actorExtId: string): Promise<Actor> {
    const actor = await this.userService.getUserByExtId(actorExtId);
    if (!actor) {
      throw HttpError.unauthorized('ACTOR_NOT_FOUND');
    }
    return { id: actor.id, uid: actor.uid, name: actor.name };
  }

  private async requireShow(studioUid: string, showUid: string) {
    const show = await this.showService.findByUidAndStudioUid(showUid, studioUid);
    if (!show) {
      throw HttpError.notFound('Show', showUid);
    }
    return show;
  }

  private async requireIssue(studioUid: string, issueUid: string): Promise<ShowIssueWithRelations> {
    const issue = await this.showIssueService.getShowIssueByUidAndStudio(issueUid, studioUid);
    if (!issue) {
      throw HttpError.notFound('ShowIssue', issueUid);
    }
    return issue;
  }

  /** Owner assignment resolves through an active `StudioMembership`, per the design doc. */
  private async resolveActiveOwner(studioUid: string, ownerUid: string): Promise<bigint> {
    const membership = await this.studioMembershipService.findStudioMemberByUserAndStudio(ownerUid, studioUid);
    if (!membership) {
      throw HttpError.badRequest('Owner must be an active member of this studio.');
    }
    return membership.userId;
  }

  private async writeAudit(params: {
    issueId: bigint;
    actor: Actor;
    action: 'CREATE' | 'UPDATE';
    operation: string;
    changes: Record<string, unknown>;
    reason?: string | null;
  }): Promise<void> {
    await this.auditService.create({
      action: params.action,
      actorId: params.actor.id,
      reason: params.reason ?? null,
      metadata: {
        operation: params.operation,
        ...params.changes,
      },
      targets: [{ targetType: 'SHOW_ISSUE', targetId: params.issueId }],
    });
  }
}
