import { Injectable, Logger } from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';

import type {
  BulkCreatorAssignmentError,
  BulkCreatorAssignmentResponse,
} from './schemas/studio-show-creator-bulk.schema';

import { HttpError } from '@/lib/errors/http-error.util';
import { CreatorRepository } from '@/models/creator/creator.repository';
import { ShowService } from '@/models/show/show.service';
import { ShowCreatorRepository } from '@/models/show-creator/show-creator.repository';
import { ShowCreatorService } from '@/models/show-creator/show-creator.service';
import { StudioCreatorRepository } from '@/models/studio-creator/studio-creator.repository';

@Injectable()
export class StudioShowCreatorOrchestrationService {
  private readonly logger = new Logger(StudioShowCreatorOrchestrationService.name);

  constructor(
    private readonly showService: ShowService,
    private readonly creatorRepository: CreatorRepository,
    private readonly studioCreatorRepository: StudioCreatorRepository,
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
    const { shows, creators } = await this.resolveShowsAndCreators(
      studioUid,
      uniqueShowUids,
      uniqueCreatorUids,
    );
    return this.appendAssignments(shows, creators, uniqueShowUids, uniqueCreatorUids);
  }

  @Transactional()
  async bulkReplaceCreatorsToShows(
    studioUid: string,
    showUids: string[],
    creatorUids: string[],
  ): Promise<BulkCreatorAssignmentResponse> {
    const uniqueShowUids = this.toUniqueUids(showUids);
    const uniqueCreatorUids = this.toUniqueUids(creatorUids);
    const { shows, creators } = await this.resolveShowsAndCreators(
      studioUid,
      uniqueShowUids,
      uniqueCreatorUids,
    );
    return this.replaceAssignments(shows, creators, uniqueShowUids, uniqueCreatorUids);
  }

  private toUniqueUids(uids: string[]): string[] {
    return Array.from(new Set(uids));
  }

  private async resolveShowsAndCreators(
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
      const foundUids = new Set(shows.map((show) => show.uid));
      const missing = showUids.filter((uid) => !foundUids.has(uid));
      throw HttpError.badRequest(
        `Shows not found or not in this studio: ${missing.join(', ')}`,
      );
    }

    const creators = await this.creatorRepository.findByUids(creatorUids);

    if (creators.length !== creatorUids.length) {
      const foundUids = new Set(creators.map((creator) => creator.uid));
      const missing = creatorUids.filter((uid) => !foundUids.has(uid));
      throw HttpError.badRequest(`Creators not found: ${missing.join(', ')}`);
    }

    const rosterRows = await this.studioCreatorRepository.findMany({
      where: {
        studio: { uid: studioUid, deletedAt: null },
        mcId: { in: creators.map((creator) => creator.id) },
        isActive: true,
        deletedAt: null,
      },
    });

    if (rosterRows.length !== creators.length) {
      const rosteredCreatorIds = new Set(rosterRows.map((row) => row.mcId));
      const unrostered = creators
        .filter((creator) => !rosteredCreatorIds.has(creator.id))
        .map((creator) => creator.uid);
      throw HttpError.badRequest(
        `Creators are not active in this studio roster: ${unrostered.join(', ')}`,
      );
    }

    return { shows, creators };
  }

  private async appendAssignments(
    shows: Awaited<ReturnType<ShowService['findMany']>>,
    creators: Awaited<ReturnType<CreatorRepository['findByUids']>>,
    showUids: string[],
    creatorUids: string[],
  ): Promise<BulkCreatorAssignmentResponse> {
    const showIds = shows.map((show) => show.id);
    const creatorIds = creators.map((creator) => creator.id);

    const existingShowCreators = await this.showCreatorRepository.findMany({
      where: {
        showId: { in: showIds },
        mcId: { in: creatorIds },
      },
    });

    const existingMap = new Map(
      existingShowCreators.map((record) => [`${record.showId}:${record.mcId}`, record]),
    );

    const showByUid = new Map(shows.map((show) => [show.uid, show]));
    const creatorByUid = new Map(creators.map((creator) => [creator.uid, creator]));

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
            const uid = this.generateShowCreatorUid();
            await this.showCreatorRepository.createAssignment({
              uid,
              showId: show.id,
              mcId: creator.id,
            });
            created++;
          } else if (existing.deletedAt !== null) {
            await this.showCreatorRepository.restoreAndUpdateAssignment(existing.id, {});
            created++;
          } else {
            skipped++;
          }
        } catch (error) {
          this.logger.error(
            `Failed to assign creator ${creatorUid} to show ${showUid}: ${(error as Error).message}`,
          );
          errors.push({
            show_id: showUid,
            creator_id: creatorUid,
            reason: (error as Error).message,
          });
        }
      }
    }

    return { created, skipped, removed: 0, errors };
  }

  private async replaceAssignments(
    shows: Awaited<ReturnType<ShowService['findMany']>>,
    creators: Awaited<ReturnType<CreatorRepository['findByUids']>>,
    showUids: string[],
    creatorUids: string[],
  ): Promise<BulkCreatorAssignmentResponse> {
    const showIds = shows.map((show) => show.id);
    const existingShowCreators = await this.showCreatorRepository.findMany({
      where: {
        showId: { in: showIds },
      },
    });

    const existingByShowId = new Map<bigint, typeof existingShowCreators>();
    existingShowCreators.forEach((record) => {
      const list = existingByShowId.get(record.showId) ?? [];
      list.push(record);
      existingByShowId.set(record.showId, list);
    });

    const showByUid = new Map(shows.map((show) => [show.uid, show]));
    const creatorByUid = new Map(creators.map((creator) => [creator.uid, creator]));
    const targetCreatorIdSet = new Set(creators.map((creator) => creator.id));

    let created = 0;
    let skipped = 0;
    let removed = 0;
    const errors: BulkCreatorAssignmentError[] = [];

    for (const showUid of showUids) {
      const show = showByUid.get(showUid)!;
      const existingForShow = existingByShowId.get(show.id) ?? [];
      const activeToRemove = existingForShow
        .filter((item) => item.deletedAt === null && !targetCreatorIdSet.has(item.mcId))
        .map((item) => item.mcId);

      if (activeToRemove.length > 0) {
        await this.showCreatorRepository.softDeleteByCreatorIds(show.id, activeToRemove);
        removed += activeToRemove.length;
      }

      const existingByCreatorId = new Map(existingForShow.map((item) => [item.mcId, item]));
      for (const creatorUid of creatorUids) {
        const creator = creatorByUid.get(creatorUid)!;
        const existing = existingByCreatorId.get(creator.id);
        try {
          if (!existing) {
            const uid = this.generateShowCreatorUid();
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
        } catch (error) {
          this.logger.error(
            `Failed to set creator ${creatorUid} on show ${showUid}: ${(error as Error).message}`,
          );
          errors.push({
            show_id: showUid,
            creator_id: creatorUid,
            reason: (error as Error).message,
          });
        }
      }
    }

    return { created, skipped, removed, errors };
  }

  private generateShowCreatorUid(): string {
    return this.showCreatorService.generateShowCreatorUid();
  }
}
