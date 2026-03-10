import { Injectable, Logger } from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';

import type {
  BulkCreatorAssignmentError,
  BulkCreatorAssignmentResponse,
} from './schemas/studio-show-mc-bulk.schema';

import { HttpError } from '@/lib/errors/http-error.util';
import { McRepository as CreatorRepository } from '@/models/mc/mc.repository';
import { ShowService } from '@/models/show/show.service';
import { ShowMcRepository as ShowCreatorRepository } from '@/models/show-mc/show-mc.repository';
import { ShowMcService as ShowCreatorService } from '@/models/show-mc/show-mc.service';
import { StudioMcRepository } from '@/models/studio-mc/studio-mc.repository';

@Injectable()
export class StudioShowMcOrchestrationService {
  private readonly logger = new Logger(StudioShowMcOrchestrationService.name);

  constructor(
    private readonly showService: ShowService,
    private readonly creatorRepository: CreatorRepository,
    private readonly studioMcRepository: StudioMcRepository,
    private readonly showCreatorRepository: ShowCreatorRepository,
    private readonly showCreatorService: ShowCreatorService,
  ) {}

  @Transactional()
  async bulkAppendCreatorsToShows(
    studioUid: string,
    showUids: string[],
    creatorUids: string[],
  ): Promise<BulkCreatorAssignmentResponse> {
    const uniqueShowUids = this.toUniqueUids(showUids);
    const uniqueCreatorUids = this.toUniqueUids(creatorUids);
    const { shows, mcs } = await this.resolveShowsAndMcs(
      studioUid,
      uniqueShowUids,
      uniqueCreatorUids,
    );
    return this.appendAssignments(shows, mcs, uniqueShowUids, uniqueCreatorUids);
  }

  @Transactional()
  async bulkReplaceCreatorsToShows(
    studioUid: string,
    showUids: string[],
    creatorUids: string[],
  ): Promise<BulkCreatorAssignmentResponse> {
    const uniqueShowUids = this.toUniqueUids(showUids);
    const uniqueCreatorUids = this.toUniqueUids(creatorUids);
    const { shows, mcs } = await this.resolveShowsAndMcs(
      studioUid,
      uniqueShowUids,
      uniqueCreatorUids,
    );
    return this.replaceAssignments(shows, mcs, uniqueShowUids, uniqueCreatorUids);
  }

  private toUniqueUids(uids: string[]): string[] {
    return Array.from(new Set(uids));
  }

  private async resolveShowsAndMcs(
    studioUid: string,
    showUids: string[],
    creatorUids: string[],
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

    // 3. Bulk-fetch creators by UIDs
    const mcs = await this.creatorRepository.findByUids(creatorUids);

    if (mcs.length !== creatorUids.length) {
      const foundUids = new Set(mcs.map((m) => m.uid));
      const missing = creatorUids.filter((uid) => !foundUids.has(uid));
      throw HttpError.badRequest(`Creators not found: ${missing.join(', ')}`);
    }

    const rosterRows = await this.studioMcRepository.findMany({
      where: {
        studio: { uid: studioUid, deletedAt: null },
        mcId: { in: mcs.map((mc) => mc.id) },
        isActive: true,
        deletedAt: null,
      },
    });

    if (rosterRows.length !== mcs.length) {
      const rosteredCreatorIds = new Set(rosterRows.map((row) => row.mcId));
      const unrostered = mcs
        .filter((creator) => !rosteredCreatorIds.has(creator.id))
        .map((creator) => creator.uid);
      throw HttpError.badRequest(
        `Creators are not active in this studio roster: ${unrostered.join(', ')}`,
      );
    }

    return { shows, mcs };
  }

  /**
   * Bulk-assigns creators to shows idempotently.
   * - Active assignments are skipped.
   * - Soft-deleted assignments are restored.
   * - Missing assignments are created.
   * All per-pair errors are collected and returned without throwing.
   */
  private async appendAssignments(
    shows: Awaited<ReturnType<ShowService['findMany']>>,
    mcs: Awaited<ReturnType<CreatorRepository['findByUids']>>,
    showUids: string[],
    creatorUids: string[],
  ): Promise<BulkCreatorAssignmentResponse> {
    const showIds = shows.map((s) => s.id);
    const mcIds = mcs.map((m) => m.id);

    const existingShowMcs = await this.showCreatorRepository.findMany({
      where: {
        showId: { in: showIds },
        mcId: { in: mcIds },
      },
    });

    const existingMap = new Map(
      existingShowMcs.map((r) => [`${r.showId}:${r.mcId}`, r]),
    );

    const showByUid = new Map(shows.map((s) => [s.uid, s]));
    const creatorByUid = new Map(mcs.map((m) => [m.uid, m]));

    let created = 0;
    let skipped = 0;
    const errors: BulkCreatorAssignmentError[] = [];

    for (const showUid of showUids) {
      for (const creatorUid of creatorUids) {
        const show = showByUid.get(showUid)!;
        const creator = creatorByUid.get(creatorUid)!;
        const key = `${show.id}:${creator.id}`;
        const existing = existingMap.get(key);

        try {
          if (!existing) {
            // Create new assignment
            const uid = this.showCreatorService.generateShowMcUid();
            await this.showCreatorRepository.createAssignment({
              uid,
              showId: show.id,
              mcId: creator.id,
            });
            created++;
          } else if (existing.deletedAt !== null) {
            // Restore soft-deleted assignment
            await this.showCreatorRepository.restoreAndUpdateAssignment(existing.id, {});
            created++;
          } else {
            // Already active — skip
            skipped++;
          }
        } catch (err) {
          this.logger.error(
            `Failed to assign creator ${creatorUid} to show ${showUid}: ${(err as Error).message}`,
          );
          errors.push({
            show_id: showUid,
            creator_id: creatorUid,
            reason: (err as Error).message,
          });
        }
      }
    }

    return { created, skipped, removed: 0, errors };
  }

  /**
   * Replaces creators on each show with the provided set.
   * - Active assignments not in the target set are soft-deleted.
   * - Active assignments in the target set are skipped.
   * - Soft-deleted assignments in the target set are restored.
   * - Missing assignments in the target set are created.
   */
  private async replaceAssignments(
    shows: Awaited<ReturnType<ShowService['findMany']>>,
    mcs: Awaited<ReturnType<CreatorRepository['findByUids']>>,
    showUids: string[],
    creatorUids: string[],
  ): Promise<BulkCreatorAssignmentResponse> {
    const showIds = shows.map((s) => s.id);
    const existingShowMcs = await this.showCreatorRepository.findMany({
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
    const creatorByUid = new Map(mcs.map((m) => [m.uid, m]));
    const targetMcIdSet = new Set(mcs.map((mc) => mc.id));

    let created = 0;
    let skipped = 0;
    let removed = 0;
    const errors: BulkCreatorAssignmentError[] = [];

    for (const showUid of showUids) {
      const show = showByUid.get(showUid)!;
      const existingForShow = existingByShowId.get(show.id) ?? [];
      const activeToRemove = existingForShow
        .filter((item) => item.deletedAt === null && !targetMcIdSet.has(item.mcId))
        .map((item) => item.mcId);

      if (activeToRemove.length > 0) {
        await this.showCreatorRepository.softDeleteByMcIds(show.id, activeToRemove);
        removed += activeToRemove.length;
      }

      const existingByMcId = new Map(existingForShow.map((item) => [item.mcId, item]));
      for (const creatorUid of creatorUids) {
        const creator = creatorByUid.get(creatorUid)!;
        const existing = existingByMcId.get(creator.id);
        try {
          if (!existing) {
            const uid = this.showCreatorService.generateShowMcUid();
            await this.showCreatorRepository.createAssignment({
              uid,
              showId: show.id,
              mcId: creator.id,
            });
            created++;
            continue;
          }
          if (existing.deletedAt !== null) {
            await this.showCreatorRepository.restoreAndUpdateAssignment(existing.id, {});
            created++;
            continue;
          }
          skipped++;
        } catch (err) {
          this.logger.error(
            `Failed to set creator ${creatorUid} on show ${showUid}: ${(err as Error).message}`,
          );
          errors.push({
            show_id: showUid,
            creator_id: creatorUid,
            reason: (err as Error).message,
          });
        }
      }
    }

    return { created, skipped, removed, errors };
  }
}
