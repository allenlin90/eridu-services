import { Injectable, Logger } from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';

import type {
  BulkMcAssignmentError,
  BulkMcAssignmentResponse,
} from './schemas/studio-show-mc-bulk.schema';

import { HttpError } from '@/lib/errors/http-error.util';
import { McRepository } from '@/models/mc/mc.repository';
import { ShowService } from '@/models/show/show.service';
import { ShowMcRepository } from '@/models/show-mc/show-mc.repository';
import { ShowMcService } from '@/models/show-mc/show-mc.service';

@Injectable()
export class StudioShowMcOrchestrationService {
  private readonly logger = new Logger(StudioShowMcOrchestrationService.name);

  constructor(
    private readonly showService: ShowService,
    private readonly mcRepository: McRepository,
    private readonly showMcRepository: ShowMcRepository,
    private readonly showMcService: ShowMcService,
  ) {}

  @Transactional()
  async bulkAppendMcsToShows(
    studioUid: string,
    showUids: string[],
    mcUids: string[],
  ): Promise<BulkMcAssignmentResponse> {
    const uniqueShowUids = this.toUniqueUids(showUids);
    const uniqueMcUids = this.toUniqueUids(mcUids);
    const { shows, mcs } = await this.resolveShowsAndMcs(
      studioUid,
      uniqueShowUids,
      uniqueMcUids,
    );
    return this.appendAssignments(shows, mcs, uniqueShowUids, uniqueMcUids);
  }

  @Transactional()
  async bulkReplaceMcsToShows(
    studioUid: string,
    showUids: string[],
    mcUids: string[],
  ): Promise<BulkMcAssignmentResponse> {
    const uniqueShowUids = this.toUniqueUids(showUids);
    const uniqueMcUids = this.toUniqueUids(mcUids);
    const { shows, mcs } = await this.resolveShowsAndMcs(
      studioUid,
      uniqueShowUids,
      uniqueMcUids,
    );
    return this.replaceAssignments(shows, mcs, uniqueShowUids, uniqueMcUids);
  }

  private toUniqueUids(uids: string[]): string[] {
    return Array.from(new Set(uids));
  }

  private async resolveShowsAndMcs(
    studioUid: string,
    showUids: string[],
    mcUids: string[],
  ) {
    const shows = await this.showService.findMany({
      where: {
        uid: { in: showUids },
        studio: { uid: studioUid },
        deletedAt: null,
      },
    });

    if (shows.length !== showUids.length) {
      const foundUids = new Set(shows.map((s) => s.uid));
      const missing = showUids.filter((uid) => !foundUids.has(uid));
      throw HttpError.badRequest(
        `Shows not found or not in this studio: ${missing.join(', ')}`,
      );
    }

    // 3. Bulk-fetch MCs by UIDs
    const mcs = await this.mcRepository.findByUids(mcUids);

    if (mcs.length !== mcUids.length) {
      const foundUids = new Set(mcs.map((m) => m.uid));
      const missing = mcUids.filter((uid) => !foundUids.has(uid));
      throw HttpError.badRequest(`MCs not found: ${missing.join(', ')}`);
    }
    return { shows, mcs };
  }

  /**
   * Bulk-assigns MCs to shows idempotently.
   * - Active assignments are skipped.
   * - Soft-deleted assignments are restored.
   * - Missing assignments are created.
   * All per-pair errors are collected and returned without throwing.
   */
  private async appendAssignments(
    shows: Awaited<ReturnType<ShowService['findMany']>>,
    mcs: Awaited<ReturnType<McRepository['findByUids']>>,
    showUids: string[],
    mcUids: string[],
  ): Promise<BulkMcAssignmentResponse> {
    const showIds = shows.map((s) => s.id);
    const mcIds = mcs.map((m) => m.id);

    const existingShowMcs = await this.showMcRepository.findMany({
      where: {
        showId: { in: showIds },
        mcId: { in: mcIds },
      },
    });

    const existingMap = new Map(
      existingShowMcs.map((r) => [`${r.showId}:${r.mcId}`, r]),
    );

    const showByUid = new Map(shows.map((s) => [s.uid, s]));
    const mcByUid = new Map(mcs.map((m) => [m.uid, m]));

    let created = 0;
    let skipped = 0;
    const errors: BulkMcAssignmentError[] = [];

    for (const showUid of showUids) {
      for (const mcUid of mcUids) {
        const show = showByUid.get(showUid)!;
        const mc = mcByUid.get(mcUid)!;
        const key = `${show.id}:${mc.id}`;
        const existing = existingMap.get(key);

        try {
          if (!existing) {
            // Create new assignment
            const uid = this.showMcService.generateShowMcUid();
            await this.showMcRepository.createAssignment({
              uid,
              showId: show.id,
              mcId: mc.id,
            });
            created++;
          } else if (existing.deletedAt !== null) {
            // Restore soft-deleted assignment
            await this.showMcRepository.restoreAndUpdateAssignment(existing.id, {});
            created++;
          } else {
            // Already active — skip
            skipped++;
          }
        } catch (err) {
          this.logger.error(
            `Failed to assign MC ${mcUid} to show ${showUid}: ${(err as Error).message}`,
          );
          errors.push({
            show_id: showUid,
            mc_id: mcUid,
            reason: (err as Error).message,
          });
        }
      }
    }

    return { created, skipped, removed: 0, errors };
  }

  /**
   * Replaces MCs on each show with the provided set.
   * - Active assignments not in the target set are soft-deleted.
   * - Active assignments in the target set are skipped.
   * - Soft-deleted assignments in the target set are restored.
   * - Missing assignments in the target set are created.
   */
  private async replaceAssignments(
    shows: Awaited<ReturnType<ShowService['findMany']>>,
    mcs: Awaited<ReturnType<McRepository['findByUids']>>,
    showUids: string[],
    mcUids: string[],
  ): Promise<BulkMcAssignmentResponse> {
    const showIds = shows.map((s) => s.id);
    const existingShowMcs = await this.showMcRepository.findMany({
      where: {
        showId: { in: showIds },
      },
    });

    const existingByShowId = new Map<bigint, typeof existingShowMcs>();
    existingShowMcs.forEach((record) => {
      const list = existingByShowId.get(record.showId) ?? [];
      list.push(record);
      existingByShowId.set(record.showId, list);
    });

    const showByUid = new Map(shows.map((s) => [s.uid, s]));
    const mcByUid = new Map(mcs.map((m) => [m.uid, m]));
    const targetMcIdSet = new Set(mcs.map((mc) => mc.id));

    let created = 0;
    let skipped = 0;
    let removed = 0;
    const errors: BulkMcAssignmentError[] = [];

    for (const showUid of showUids) {
      const show = showByUid.get(showUid)!;
      const existingForShow = existingByShowId.get(show.id) ?? [];
      const activeToRemove = existingForShow
        .filter((item) => item.deletedAt === null && !targetMcIdSet.has(item.mcId))
        .map((item) => item.mcId);

      if (activeToRemove.length > 0) {
        await this.showMcRepository.softDeleteByMcIds(show.id, activeToRemove);
        removed += activeToRemove.length;
      }

      const existingByMcId = new Map(existingForShow.map((item) => [item.mcId, item]));
      for (const mcUid of mcUids) {
        const mc = mcByUid.get(mcUid)!;
        const existing = existingByMcId.get(mc.id);
        try {
          if (!existing) {
            const uid = this.showMcService.generateShowMcUid();
            await this.showMcRepository.createAssignment({
              uid,
              showId: show.id,
              mcId: mc.id,
            });
            created++;
            continue;
          }
          if (existing.deletedAt !== null) {
            await this.showMcRepository.restoreAndUpdateAssignment(existing.id, {});
            created++;
            continue;
          }
          skipped++;
        } catch (err) {
          this.logger.error(
            `Failed to set MC ${mcUid} on show ${showUid}: ${(err as Error).message}`,
          );
          errors.push({
            show_id: showUid,
            mc_id: mcUid,
            reason: (err as Error).message,
          });
        }
      }
    }

    return { created, skipped, removed, errors };
  }
}
