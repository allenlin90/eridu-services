import { Injectable } from '@nestjs/common';
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';

import { StorageService } from '@/lib/storage/storage.service';

/** One resolved image evidence record pinned onto a Scene QC review save. */
export type ResolvedSceneQcEvidence = {
  sourceTaskId: bigint;
  sourceTaskUid: string;
  sourceTaskVersion: number;
  sourceFieldKey: string;
  sourceLabel: string;
  objectKey: string | null;
  fileUrl: string;
};

function isSafeRemoteUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
}

/**
 * §5.2 read path: bulk-resolves EXPLICIT image evidence for a set of Shows
 * through Task -> immutable snapshot -> TaskTemplateSceneQcEvidenceRef ->
 * task.content[fieldKey]. The join to explicit refs is the ONLY binding
 * source -- the snapshot JSON schema is never re-parsed for discovery, and
 * there is no recursive URL search, filename matching, or metric-label
 * matching (the old `models/task/scene-review.mapper.ts` heuristics the main
 * integration PR deletes). See SCENE_QC_CHILD_PR_3_BREAKDOWN.md section 1.7.
 *
 * PRIVATE to SceneQcModule.
 */
@Injectable()
export class SceneQcEvidenceResolver {
  constructor(
    private readonly txHost: TransactionHost<TransactionalAdapterPrisma>,
    private readonly storageService: StorageService,
  ) {}

  /**
   * Bulk API -- never resolve per-Show in a loop. Returns a Map keyed by
   * `Show.id`; a Show with no designated evidence is present with an empty
   * array (never simply absent) so callers can treat "no entry" and
   * "resolved to zero" identically.
   */
  async resolveForShows(showIds: bigint[]): Promise<Map<bigint, ResolvedSceneQcEvidence[]>> {
    const result = new Map<bigint, ResolvedSceneQcEvidence[]>();
    for (const showId of showIds) {
      result.set(showId, []);
    }
    if (showIds.length === 0) {
      return result;
    }

    const tasks = await this.txHost.tx.task.findMany({
      where: {
        deletedAt: null,
        snapshotId: { not: null },
        targets: {
          some: {
            targetType: 'SHOW',
            showId: { in: showIds },
            deletedAt: null,
          },
        },
      },
      select: {
        id: true,
        uid: true,
        version: true,
        content: true,
        targets: {
          where: {
            targetType: 'SHOW',
            showId: { in: showIds },
            deletedAt: null,
          },
          select: { showId: true },
        },
        snapshot: {
          select: {
            sceneQcEvidenceRefs: {
              select: { fieldKey: true, label: true },
            },
          },
        },
      },
    });

    // Deterministic across the whole resolution: sort by (task.uid ASC,
    // fieldKey ASC) before assigning per-show sortOrder (OQ-16).
    const sortedTasks = [...tasks].sort((a, b) => a.uid.localeCompare(b.uid));

    type TaskEvidenceEntry = {
      showId: bigint;
      fieldKey: string;
      entry: ResolvedSceneQcEvidence;
    };
    const entries: TaskEvidenceEntry[] = [];

    for (const task of sortedTasks) {
      const refs = task.snapshot?.sceneQcEvidenceRefs ?? [];
      if (refs.length === 0 || task.targets.length === 0) {
        continue;
      }

      const content = (task.content ?? {}) as Record<string, unknown>;
      const sortedRefs = [...refs].sort((a, b) => a.fieldKey.localeCompare(b.fieldKey));

      for (const ref of sortedRefs) {
        const value = content[ref.fieldKey];
        if (typeof value !== 'string' || !isSafeRemoteUrl(value)) {
          continue;
        }

        const objectKey = this.storageService.deriveObjectKeyFromPublicUrl(value);
        const resolved: ResolvedSceneQcEvidence = {
          sourceTaskId: task.id,
          sourceTaskUid: task.uid,
          sourceTaskVersion: task.version,
          sourceFieldKey: ref.fieldKey,
          sourceLabel: ref.label,
          objectKey,
          fileUrl: value,
        };

        for (const target of task.targets) {
          if (target.showId === null || !result.has(target.showId)) {
            continue;
          }
          entries.push({ showId: target.showId, fieldKey: ref.fieldKey, entry: resolved });
        }
      }
    }

    const seenFileUrlsByShow = new Map<bigint, Set<string>>();
    for (const { showId, entry } of entries) {
      const seen = seenFileUrlsByShow.get(showId) ?? new Set<string>();
      seenFileUrlsByShow.set(showId, seen);
      if (seen.has(entry.fileUrl)) {
        // Dedupe by fileUrl within a Show -- the same asset bound twice
        // yields one evidence row.
        continue;
      }
      seen.add(entry.fileUrl);
      result.get(showId)!.push(entry);
    }

    return result;
  }
}
