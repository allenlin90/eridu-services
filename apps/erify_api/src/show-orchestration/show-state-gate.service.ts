import { Injectable } from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';
import type { Prisma, Task } from '@prisma/client';
import { TaskStatus, TaskType } from '@prisma/client';

import type { GateHistoryEntry, GateKind, GateOutcome } from './show-state-gate.config';
import { getGateConfig, RESTORE_PREVIOUS_OUTCOME } from './show-state-gate.config';

import { HttpError } from '@/lib/errors/http-error.util';
import { AuditService } from '@/models/audit/audit.service';
import { ShowRepository } from '@/models/show/show.repository';
import { ShowStatusService } from '@/models/show-status/show-status.service';
import { TaskRepository } from '@/models/task/task.repository';
import { TaskService } from '@/models/task/task.service';
import { TaskTargetService } from '@/models/task-target/task-target.service';

export type GateActor = { id: bigint; uid: string };

export type OpenGateParams = {
  owner: GateActor | null;
  fromStatusSystemKey: string;
  dueDate?: Date | null;
  content: Record<string, unknown>;
  createdBy?: GateActor | null;
  studioId?: bigint | null;
};

@Injectable()
export class ShowStateGateService {
  constructor(
    private readonly taskService: TaskService,
    private readonly taskRepository: TaskRepository,
    private readonly taskTargetService: TaskTargetService,
    private readonly showRepository: ShowRepository,
    private readonly showStatusService: ShowStatusService,
    private readonly auditService: AuditService,
  ) {}

  @Transactional()
  async openGate(
    showId: bigint,
    gateKind: GateKind,
    params: OpenGateParams,
  ): Promise<Task> {
    const config = getGateConfig(gateKind);
    if (config.requiresOwner && params.owner == null) {
      throw HttpError.badRequest(`GATE_OWNER_REQUIRED:${gateKind}`);
    }

    const pendingStatus = await this.showStatusService.getShowStatusBySystemKey(
      config.pendingStatus,
    );
    if (!pendingStatus) {
      throw HttpError.badRequest(
        `SHOW_STATUS_NOT_CONFIGURED:${config.pendingStatus}`,
      );
    }

    await this.showRepository.update(
      { id: showId },
      { showStatus: { connect: { id: pendingStatus.id } } },
    );

    const reasonNote = params.content.reason_note;
    const openedEntry: GateHistoryEntry = {
      event: 'opened',
      actor_id: params.owner?.uid ?? params.createdBy?.uid ?? null,
      at: new Date().toISOString(),
      ...(typeof reasonNote === 'string' && { note: reasonNote }),
    };

    const task = await this.taskService.create({
      uid: this.taskService.generateTaskUid(),
      description: `Show lifecycle gate: ${gateKind}`,
      type: TaskType.STATE_GATE,
      assigneeId: params.owner?.id ?? null,
      studioId: params.studioId ?? null,
      dueDate: params.dueDate ?? null,
      content: {
        ...params.content,
        history: [openedEntry],
      } as Prisma.InputJsonValue,
      metadata: {
        gate_kind: gateKind,
        from_status: params.fromStatusSystemKey,
        pending_status: config.pendingStatus,
      } as Prisma.InputJsonValue,
      targets: {
        create: [{ targetType: 'SHOW', targetId: showId, showId }],
      },
    } as Prisma.TaskCreateInput);

    await this.auditService.create({
      action: 'OVERRIDE',
      actorId: params.createdBy?.id ?? params.owner?.id ?? null,
      reason: typeof reasonNote === 'string' ? reasonNote : undefined,
      metadata: {
        field: 'show_status',
        old_value: params.fromStatusSystemKey,
        new_value: config.pendingStatus,
        gate_task_uid: task.uid,
        gate_kind: gateKind,
      },
      targets: [{ targetType: 'SHOW', targetId: showId }],
    });

    return task;
  }

  @Transactional()
  async claimGate(taskUid: string, claimant: GateActor): Promise<Task> {
    const task = await this.taskRepository.findByUid(taskUid);
    if (!task) {
      throw HttpError.notFound('Task', taskUid);
    }

    if (task.assigneeId != null) {
      throw HttpError.badRequest(`GATE_ALREADY_CLAIMED:${taskUid}`);
    }

    const content
      = task.content != null
      && typeof task.content === 'object'
      && !Array.isArray(task.content)
        ? (task.content as Record<string, unknown>)
        : {};
    const existingHistory = Array.isArray(content.history)
      ? content.history
      : [];
    const claimedEntry: GateHistoryEntry = {
      event: 'claimed',
      actor_id: claimant.uid,
      at: new Date().toISOString(),
    };

    return this.taskRepository.updateWithVersionCheck(
      { uid: taskUid, version: task.version },
      {
        assignee: { connect: { id: claimant.id } },
        version: { increment: 1 },
        content: {
          ...content,
          history: [...existingHistory, claimedEntry],
        } as Prisma.InputJsonValue,
      },
    );
  }

  @Transactional()
  async resolveGate(
    taskUid: string,
    outcome: GateOutcome,
    notes: string,
    actor: GateActor,
  ): Promise<Task> {
    const task = await this.taskRepository.findByUid(taskUid);
    if (!task) {
      throw HttpError.notFound('Task', taskUid);
    }

    const metadata = this.asObject(task.metadata) as {
      gate_kind?: GateKind;
      from_status?: string;
      pending_status?: string;
    };
    const gateKind = metadata.gate_kind;
    if (!gateKind) {
      throw HttpError.badRequest(`NOT_A_GATE_TASK:${taskUid}`);
    }
    const config = getGateConfig(gateKind);

    const targets = await this.taskTargetService.findByTaskId(task.id);
    const showTarget = targets.find((target) => target.showId != null);
    if (!showTarget?.showId) {
      throw HttpError.badRequest(`GATE_HAS_NO_SHOW_TARGET:${taskUid}`);
    }

    const show = await this.showRepository.findById(showTarget.showId, {
      showStatus: true,
    });
    if (!show || show.showStatus?.systemKey !== config.pendingStatus) {
      throw HttpError.conflict(`GATE_STATE_STALE:${taskUid}`);
    }

    if (task.assigneeId == null) {
      throw HttpError.badRequest(`GATE_NOT_CLAIMED:${taskUid}`);
    }

    if (!(config.allowedOutcomes as readonly string[]).includes(outcome)) {
      throw HttpError.badRequest(`GATE_OUTCOME_NOT_ALLOWED:${outcome}`);
    }

    if ((config.outcomesRequiringNoActiveTasks as readonly string[]).includes(outcome)) {
      const activeTaskCount = await this.taskTargetService.countActiveByShowId(
        showTarget.showId,
        { excludeTaskId: task.id },
      );
      if (activeTaskCount > 0) {
        throw HttpError.badRequestWithDetails(`ACTIVE_TASKS_REMAIN:${taskUid}`, {
          activeTaskCount,
        });
      }
    }

    if (outcome === 'CANCELLED' && metadata.from_status === 'LIVE') {
      throw HttpError.badRequest(`LIVE_CANCELLATION_REQUIRES_OVERRIDE:${taskUid}`);
    }

    const targetStatusSystemKey
      = outcome === RESTORE_PREVIOUS_OUTCOME ? metadata.from_status : outcome;
    if (!targetStatusSystemKey) {
      throw HttpError.badRequest(`GATE_FROM_STATUS_MISSING:${taskUid}`);
    }

    const targetStatus = await this.showStatusService.getShowStatusBySystemKey(
      targetStatusSystemKey,
    );
    if (!targetStatus) {
      throw HttpError.badRequest(
        `SHOW_STATUS_NOT_CONFIGURED:${targetStatusSystemKey}`,
      );
    }

    await this.showRepository.update(
      { id: showTarget.showId },
      { showStatus: { connect: { id: targetStatus.id } } },
    );

    const content = this.asObject(task.content);
    const history = Array.isArray(content.history) ? content.history : [];
    const resolvedEntry: GateHistoryEntry = {
      event: 'resolved',
      actor_id: actor.uid,
      at: new Date().toISOString(),
      ...(notes && { note: notes }),
    };

    const resolvedTask = await this.taskRepository.updateWithVersionCheck(
      { uid: taskUid, version: task.version },
      {
        status: TaskStatus.COMPLETED,
        completedAt: new Date(),
        version: { increment: 1 },
        content: {
          ...content,
          resolution_notes: notes,
          history: [...history, resolvedEntry],
        } as Prisma.InputJsonValue,
      },
    );

    await this.auditService.create({
      action: 'OVERRIDE',
      actorId: actor.id,
      reason: notes,
      metadata: {
        field: 'show_status',
        old_value: config.pendingStatus,
        new_value: targetStatusSystemKey,
        gate_task_uid: taskUid,
        gate_kind: gateKind,
      },
      targets: [{ targetType: 'SHOW', targetId: showTarget.showId }],
    });

    return resolvedTask;
  }

  private asObject(value: Prisma.JsonValue): Record<string, unknown> {
    return value != null && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  }
}
