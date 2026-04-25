import { Injectable } from '@nestjs/common';
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';

import type { PublishScheduleSummary } from './schemas/schedule-planning.schema';
import type {
  DiffIncomingShow,
  PublishingUidMaps,
} from './publishing.types';

import { ShowCreatorService } from '@/models/show-creator/show-creator.service';
import { ShowPlatformService } from '@/models/show-platform/show-platform.service';

@Injectable()
export class PublishingRelationSyncService {
  constructor(
    private readonly txHost: TransactionHost<TransactionalAdapterPrisma>,
    private readonly showCreatorService: ShowCreatorService,
    private readonly showPlatformService: ShowPlatformService,
  ) {}

  async syncShowRelations(
    incomingByShowId: Map<bigint, DiffIncomingShow>,
    uidMaps: PublishingUidMaps,
    summary: PublishScheduleSummary,
  ): Promise<void> {
    const tx = this.txHost.tx;
    const showIds = Array.from(incomingByShowId.keys());

    if (showIds.length === 0) {
      return;
    }

    const existingShowCreators = await tx.showCreator.findMany({
      where: { showId: { in: showIds } },
      select: {
        id: true,
        showId: true,
        creatorId: true,
        note: true,
        metadata: true,
        deletedAt: true,
      },
    });

    const existingShowPlatforms = await tx.showPlatform.findMany({
      where: { showId: { in: showIds } },
      select: {
        id: true,
        showId: true,
        platformId: true,
        liveStreamLink: true,
        platformShowId: true,
        metadata: true,
        deletedAt: true,
      },
    });

    const showCreatorByShowId = new Map<bigint, typeof existingShowCreators>();
    existingShowCreators.forEach((row) => {
      const list = showCreatorByShowId.get(row.showId) || [];
      list.push(row);
      showCreatorByShowId.set(row.showId, list);
    });

    const showPlatformByShowId = new Map<bigint, typeof existingShowPlatforms>();
    existingShowPlatforms.forEach((row) => {
      const list = showPlatformByShowId.get(row.showId) || [];
      list.push(row);
      showPlatformByShowId.set(row.showId, list);
    });

    for (const [showId, incoming] of incomingByShowId.entries()) {
      await this.syncCreatorsForShow({
        showId,
        incoming,
        uidMaps,
        summary,
        existingCreators: showCreatorByShowId.get(showId) || [],
      });

      await this.syncPlatformsForShow({
        showId,
        incoming,
        uidMaps,
        summary,
        existingPlatforms: showPlatformByShowId.get(showId) || [],
      });
    }
  }

  private async syncCreatorsForShow(params: {
    showId: bigint;
    incoming: DiffIncomingShow;
    uidMaps: PublishingUidMaps;
    summary: PublishScheduleSummary;
    existingCreators: Array<{
      id: bigint;
      creatorId: bigint;
      note: string | null;
      deletedAt: Date | null;
    }>;
  }): Promise<void> {
    const tx = this.txHost.tx;
    const incomingCreatorById = new Map<bigint, { note: string | undefined }>();

    (params.incoming.source.creators || []).forEach((creator) => {
      const creatorInternalId = params.uidMaps.creators.get(creator.creatorId);
      if (!creatorInternalId) {
        return;
      }
      incomingCreatorById.set(creatorInternalId, { note: creator.note });
    });

    const existingCreatorById = new Map(
      params.existingCreators.map((creator) => [creator.creatorId, creator]),
    );

    for (const [creatorId, incomingCreator] of incomingCreatorById.entries()) {
      const existing = existingCreatorById.get(creatorId);

      if (!existing) {
        await tx.showCreator.create({
          data: {
            uid: this.showCreatorService.generateShowCreatorUid(),
            showId: params.showId,
            creatorId,
            note: incomingCreator.note,
            metadata: {},
          },
        });
        params.summary.creator_links_added += 1;
        continue;
      }

      if (existing.deletedAt) {
        await tx.showCreator.update({
          where: { id: existing.id },
          data: {
            deletedAt: null,
            note: incomingCreator.note,
            metadata: {},
          },
        });
        params.summary.creator_links_added += 1;
        continue;
      }

      if ((existing.note || null) !== (incomingCreator.note || null)) {
        await tx.showCreator.update({
          where: { id: existing.id },
          data: {
            note: incomingCreator.note,
          },
        });
        params.summary.creator_links_updated += 1;
      }
    }

    const staleCreatorIds = params.existingCreators
      .filter((creator) => creator.deletedAt === null && !incomingCreatorById.has(creator.creatorId))
      .map((creator) => creator.id);

    if (staleCreatorIds.length > 0) {
      await tx.showCreator.updateMany({
        where: {
          id: { in: staleCreatorIds },
          deletedAt: null,
        },
        data: {
          deletedAt: new Date(),
        },
      });
      params.summary.creator_links_removed += staleCreatorIds.length;
    }
  }

  private async syncPlatformsForShow(params: {
    showId: bigint;
    incoming: DiffIncomingShow;
    uidMaps: PublishingUidMaps;
    summary: PublishScheduleSummary;
    existingPlatforms: Array<{
      id: bigint;
      platformId: bigint;
      liveStreamLink: string | null;
      platformShowId: string | null;
      deletedAt: Date | null;
    }>;
  }): Promise<void> {
    const tx = this.txHost.tx;
    const incomingPlatformById = new Map<bigint, {
      liveStreamLink: string | undefined;
      platformShowId: string | undefined;
    }>();

    (params.incoming.source.platforms || []).forEach((platform) => {
      const platformId = params.uidMaps.platforms.get(platform.platformId);
      if (!platformId) {
        return;
      }
      incomingPlatformById.set(platformId, {
        liveStreamLink: platform.liveStreamLink,
        platformShowId: platform.platformShowId,
      });
    });

    const existingPlatformById = new Map(
      params.existingPlatforms.map((platform) => [platform.platformId, platform]),
    );

    for (const [platformId, incomingPlatform] of incomingPlatformById.entries()) {
      const existing = existingPlatformById.get(platformId);

      if (!existing) {
        await tx.showPlatform.create({
          data: {
            uid: this.showPlatformService.generateShowPlatformUid(),
            showId: params.showId,
            platformId,
            liveStreamLink: incomingPlatform.liveStreamLink,
            platformShowId: incomingPlatform.platformShowId,
            viewerCount: 0,
            metadata: {},
          },
        });
        params.summary.platform_links_added += 1;
        continue;
      }

      if (existing.deletedAt) {
        await tx.showPlatform.update({
          where: { id: existing.id },
          data: {
            deletedAt: null,
            liveStreamLink: incomingPlatform.liveStreamLink,
            platformShowId: incomingPlatform.platformShowId,
            metadata: {},
          },
        });
        params.summary.platform_links_added += 1;
        continue;
      }

      const hasChanged = (existing.liveStreamLink || null) !== (incomingPlatform.liveStreamLink || null)
        || (existing.platformShowId || null) !== (incomingPlatform.platformShowId || null);

      if (hasChanged) {
        await tx.showPlatform.update({
          where: { id: existing.id },
          data: {
            liveStreamLink: incomingPlatform.liveStreamLink,
            platformShowId: incomingPlatform.platformShowId,
          },
        });
        params.summary.platform_links_updated += 1;
      }
    }

    const stalePlatformIds = params.existingPlatforms
      .filter((platform) => platform.deletedAt === null && !incomingPlatformById.has(platform.platformId))
      .map((platform) => platform.id);

    if (stalePlatformIds.length > 0) {
      await tx.showPlatform.updateMany({
        where: {
          id: { in: stalePlatformIds },
          deletedAt: null,
        },
        data: {
          deletedAt: new Date(),
        },
      });
      params.summary.platform_links_removed += stalePlatformIds.length;
    }
  }
}
