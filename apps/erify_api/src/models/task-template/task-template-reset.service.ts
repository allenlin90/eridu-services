import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';

import { UID_PREFIXES } from '@eridu/api-types/constants';

import { HttpError } from '@/lib/errors/http-error.util';
import { PrismaService } from '@/prisma/prisma.service';

export type TaskTemplateResetInput = {
  studioUid: string;
  templateUids?: string[];
  allTemplates?: boolean;
};

export type TaskTemplateResetStudioSummary = {
  id: bigint;
  uid: string;
  name: string;
};

export type TaskTemplateResetTemplateSummary = {
  id: bigint;
  uid: string;
  name: string;
  description: string | null;
  isActive: boolean;
  isSoftDeleted: boolean;
  snapshotCount: number;
  taskCountTotal: number;
  taskCountActive: number;
  boundShowCount: number;
  lastUsedAt: string | null;
};

export type TaskTemplateResetDefinitionReference = {
  id: string;
  name: string;
  sourceTemplateIds: string[];
  templateScopedColumnTemplateIds: string[];
};

export type TaskTemplateResetPlan = {
  studio: TaskTemplateResetStudioSummary;
  templates: TaskTemplateResetTemplateSummary[];
  staleReportDefinitions: TaskTemplateResetDefinitionReference[];
  totalTaskCount: number;
  totalActiveTaskCount: number;
  totalSnapshotCount: number;
  canExecute: boolean;
  taskIdsToDelete: bigint[];
  templateIdsToDelete: bigint[];
};

export type TaskTemplateResetExecutionResult = TaskTemplateResetPlan & {
  deletedTaskCount: number;
  deletedTemplateCount: number;
};

type ResetCandidateTaskRow = {
  id: bigint;
  createdAt: Date;
  deletedAt: Date | null;
  templateId: bigint | null;
  snapshot: {
    templateId: bigint;
  } | null;
  targets: Array<{
    showId: bigint | null;
  }>;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values)];
}

function extractStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === 'string');
}

export function readTemplateScopedColumnTemplateUid(columnKey: string): string | null {
  const separatorIndex = columnKey.indexOf(':');
  if (separatorIndex <= 0 || separatorIndex === columnKey.length - 1) {
    return null;
  }

  const templateUid = columnKey.slice(0, separatorIndex);
  return templateUid.startsWith(UID_PREFIXES.TASK_TEMPLATE) ? templateUid : null;
}

export function extractTaskReportDefinitionReferences(definition: unknown): {
  sourceTemplateIds: string[];
  templateScopedColumnTemplateIds: string[];
} {
  const definitionRecord = isRecord(definition) ? definition : {};
  const scopeRecord = isRecord(definitionRecord.scope) ? definitionRecord.scope : {};
  const columns = Array.isArray(definitionRecord.columns) ? definitionRecord.columns : [];

  const sourceTemplateIds = uniqueStrings(
    extractStringArray(scopeRecord.source_templates)
      .filter((templateUid) => templateUid.startsWith(UID_PREFIXES.TASK_TEMPLATE)),
  );

  const templateScopedColumnTemplateIds = uniqueStrings(
    columns.flatMap((column) => {
      if (!isRecord(column) || typeof column.key !== 'string') {
        return [];
      }

      const templateUid = readTemplateScopedColumnTemplateUid(column.key);
      return templateUid ? [templateUid] : [];
    }),
  );

  return {
    sourceTemplateIds,
    templateScopedColumnTemplateIds,
  };
}

@Injectable()
export class TaskTemplateResetService {
  constructor(private readonly prisma: PrismaService) {}

  async planReset(input: TaskTemplateResetInput): Promise<TaskTemplateResetPlan> {
    const selection = this.normalizeSelection(input);

    const studio = await this.prisma.studio.findFirst({
      where: { uid: selection.studioUid },
      select: {
        id: true,
        uid: true,
        name: true,
      },
    });

    if (!studio) {
      throw HttpError.notFound('Studio', selection.studioUid);
    }

    const templates = await this.prisma.taskTemplate.findMany({
      where: {
        studioId: studio.id,
        ...(selection.allTemplates
          ? {}
          : {
              uid: {
                in: selection.templateUids,
              },
            }),
      },
      select: {
        id: true,
        uid: true,
        name: true,
        description: true,
        isActive: true,
        deletedAt: true,
        _count: {
          select: {
            snapshots: true,
          },
        },
      },
      orderBy: [
        { updatedAt: 'desc' },
        { uid: 'asc' },
      ],
    });

    if (!selection.allTemplates) {
      const foundTemplateUids = new Set(templates.map((template) => template.uid));
      const missingTemplateUids = selection.templateUids.filter((templateUid) => !foundTemplateUids.has(templateUid));
      if (missingTemplateUids.length > 0) {
        throw HttpError.badRequest(
          `Task templates were not found in studio ${studio.uid}: ${missingTemplateUids.join(', ')}`,
        );
      }
    }

    if (templates.length === 0) {
      throw HttpError.badRequest(`No task templates matched the reset selection for studio ${studio.uid}`);
    }

    const templateIds = templates.map((template) => template.id);
    const targetTemplateIdSet = new Set(templateIds);
    const relatedTaskWhere = this.buildRelatedTaskWhere(templateIds);

    const crossStudioTaskCount = await this.prisma.task.count({
      where: {
        AND: [
          relatedTaskWhere,
          {
            NOT: {
              studioId: studio.id,
            },
          },
        ],
      },
    });

    if (crossStudioTaskCount > 0) {
      throw HttpError.badRequest(
        `Found ${crossStudioTaskCount} task(s) bound to target templates outside studio ${studio.uid}. Reset aborted.`,
      );
    }

    const tasks = await this.prisma.task.findMany({
      where: {
        AND: [
          relatedTaskWhere,
          {
            studioId: studio.id,
          },
        ],
      },
      select: {
        id: true,
        createdAt: true,
        deletedAt: true,
        templateId: true,
        snapshot: {
          select: {
            templateId: true,
          },
        },
        targets: {
          where: {
            deletedAt: null,
            targetType: 'SHOW',
            showId: {
              not: null,
            },
          },
          select: {
            showId: true,
          },
        },
      },
    });

    const definitions = await this.prisma.taskReportDefinition.findMany({
      where: {
        studioId: studio.id,
        deletedAt: null,
      },
      select: {
        uid: true,
        name: true,
        definition: true,
      },
    });

    const planByTemplateId = new Map<bigint, {
      summary: TaskTemplateResetTemplateSummary;
      showIds: Set<string>;
      lastUsedAt: Date | null;
    }>();

    for (const template of templates) {
      planByTemplateId.set(template.id, {
        summary: {
          id: template.id,
          uid: template.uid,
          name: template.name,
          description: template.description,
          isActive: template.isActive,
          isSoftDeleted: template.deletedAt !== null,
          snapshotCount: template._count.snapshots,
          taskCountTotal: 0,
          taskCountActive: 0,
          boundShowCount: 0,
          lastUsedAt: null,
        },
        showIds: new Set<string>(),
        lastUsedAt: null,
      });
    }

    for (const task of tasks) {
      const matchedTemplateId = this.resolveTemplateIdForTask(task, targetTemplateIdSet);
      if (!matchedTemplateId) {
        continue;
      }

      const planEntry = planByTemplateId.get(matchedTemplateId);
      if (!planEntry) {
        continue;
      }

      planEntry.summary.taskCountTotal += 1;
      if (task.deletedAt === null) {
        planEntry.summary.taskCountActive += 1;
      }

      if (!planEntry.lastUsedAt || task.createdAt > planEntry.lastUsedAt) {
        planEntry.lastUsedAt = task.createdAt;
      }

      for (const target of task.targets) {
        if (target.showId !== null) {
          planEntry.showIds.add(target.showId.toString());
        }
      }
    }

    const templateSummaries = templates.map((template) => {
      const planEntry = planByTemplateId.get(template.id);
      if (!planEntry) {
        throw new Error(`Missing reset summary for template ${template.uid}`);
      }

      planEntry.summary.boundShowCount = planEntry.showIds.size;
      planEntry.summary.lastUsedAt = planEntry.lastUsedAt?.toISOString() ?? null;
      return planEntry.summary;
    });

    const targetTemplateUidSet = new Set(templateSummaries.map((template) => template.uid));
    const staleReportDefinitions = definitions.flatMap((definition) => {
      const references = extractTaskReportDefinitionReferences(definition.definition);
      const sourceTemplateIds = references.sourceTemplateIds.filter((uid) => targetTemplateUidSet.has(uid));
      const templateScopedColumnTemplateIds = references.templateScopedColumnTemplateIds
        .filter((uid) => targetTemplateUidSet.has(uid));

      if (sourceTemplateIds.length === 0 && templateScopedColumnTemplateIds.length === 0) {
        return [];
      }

      return [{
        id: definition.uid,
        name: definition.name,
        sourceTemplateIds,
        templateScopedColumnTemplateIds,
      }];
    });

    return {
      studio: {
        id: studio.id,
        uid: studio.uid,
        name: studio.name,
      },
      templates: templateSummaries,
      staleReportDefinitions,
      totalTaskCount: templateSummaries.reduce((sum, template) => sum + template.taskCountTotal, 0),
      totalActiveTaskCount: templateSummaries.reduce((sum, template) => sum + template.taskCountActive, 0),
      totalSnapshotCount: templateSummaries.reduce((sum, template) => sum + template.snapshotCount, 0),
      canExecute: staleReportDefinitions.length === 0,
      taskIdsToDelete: tasks.map((task) => task.id),
      templateIdsToDelete: templateIds,
    };
  }

  async executeReset(input: TaskTemplateResetInput): Promise<TaskTemplateResetExecutionResult> {
    const plan = await this.planReset(input);

    if (plan.staleReportDefinitions.length > 0) {
      const definitionIds = plan.staleReportDefinitions.map((definition) => definition.id).join(', ');
      throw HttpError.badRequest(
        `Task template reset aborted because saved task report definitions reference target templates: ${definitionIds}`,
      );
    }

    const deleted = await this.prisma.$transaction(async (tx) => {
      const deletedTaskCount = plan.taskIdsToDelete.length === 0
        ? 0
        : (await tx.task.deleteMany({
            where: {
              id: { in: plan.taskIdsToDelete },
              studioId: plan.studio.id,
            },
          })).count;

      if (deletedTaskCount !== plan.taskIdsToDelete.length) {
        throw HttpError.conflict(
          `Expected to delete ${plan.taskIdsToDelete.length} task(s), but deleted ${deletedTaskCount}`,
        );
      }

      const deletedTemplateCount = (await tx.taskTemplate.deleteMany({
        where: {
          id: { in: plan.templateIdsToDelete },
          studioId: plan.studio.id,
        },
      })).count;

      if (deletedTemplateCount !== plan.templateIdsToDelete.length) {
        throw HttpError.conflict(
          `Expected to delete ${plan.templateIdsToDelete.length} template(s), but deleted ${deletedTemplateCount}`,
        );
      }

      const remainingSnapshots = await tx.taskTemplateSnapshot.count({
        where: {
          templateId: { in: plan.templateIdsToDelete },
        },
      });

      if (remainingSnapshots !== 0) {
        throw HttpError.conflict('Task template snapshot cascade delete did not complete cleanly');
      }

      return {
        deletedTaskCount,
        deletedTemplateCount,
      };
    });

    return {
      ...plan,
      ...deleted,
    };
  }

  private normalizeSelection(input: TaskTemplateResetInput): Required<Pick<TaskTemplateResetInput, 'studioUid' | 'allTemplates'>> & { templateUids: string[] } {
    const studioUid = input.studioUid.trim();
    if (studioUid.length === 0) {
      throw HttpError.badRequest('studioUid is required');
    }

    const templateUids = uniqueStrings((input.templateUids ?? []).map((value) => value.trim()).filter((value) => value.length > 0));
    const allTemplates = input.allTemplates === true;

    if (allTemplates === (templateUids.length > 0)) {
      throw HttpError.badRequest('Provide either allTemplates=true or one or more templateUids');
    }

    return {
      studioUid,
      templateUids,
      allTemplates,
    };
  }

  private buildRelatedTaskWhere(templateIds: bigint[]): Prisma.TaskWhereInput {
    return {
      OR: [
        {
          templateId: {
            in: templateIds,
          },
        },
        {
          snapshot: {
            is: {
              templateId: {
                in: templateIds,
              },
            },
          },
        },
      ],
    };
  }

  private resolveTemplateIdForTask(
    task: ResetCandidateTaskRow,
    targetTemplateIdSet: Set<bigint>,
  ): bigint | null {
    if (task.templateId !== null && targetTemplateIdSet.has(task.templateId)) {
      return task.templateId;
    }

    if (task.snapshot?.templateId !== undefined && targetTemplateIdSet.has(task.snapshot.templateId)) {
      return task.snapshot.templateId;
    }

    return null;
  }
}
