import { Injectable } from '@nestjs/common';
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';

import type { PublishScheduleSummary } from './schemas/schedule-planning.schema';
import type {
  DiffIncomingShow,
  HeldBackRelations,
  PublishingUidMaps,
  ShowRelationSyncChanges,
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
    showActualsById: Map<bigint, boolean>,
  ): Promise<{
      relationChangesByShowId: Map<bigint, ShowRelationSyncChanges>;
      heldBackRelationsByShowId: Map<bigint, HeldBackRelations>;
    }> {
    const tx = this.txHost.tx;
    const showIds = Array.from(incomingByShowId.keys());
    const relationChangesByShowId = new Map<bigint, ShowRelationSyncChanges>();
    const heldBackRelationsByShowId = new Map<bigint, HeldBackRelations>();

    if (showIds.length === 0) {
      return { relationChangesByShowId, heldBackRelationsByShowId };
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
        actualStartTime: true,
        actualEndTime: true,
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
        actualStartTime: true,
        actualEndTime: true,
      },
    });

    // Resolved from the *existing* rows, not `uidMaps` (which is built only from
    // creators/platforms referenced in the incoming plan) — a held-back removal's
    // creator/platform may not appear in the incoming payload at all, so its uid
    // would never be resolvable from `uidMaps`.
    const existingCreatorIds = Array.from(new Set(existingShowCreators.map((row) => row.creatorId)));
    const existingPlatformIds = Array.from(new Set(existingShowPlatforms.map((row) => row.platformId)));
    const [creatorUidRows, platformUidRows] = await Promise.all([
      existingCreatorIds.length > 0
        ? tx.creator.findMany({ where: { id: { in: existingCreatorIds } }, select: { id: true, uid: true } })
        : Promise.resolve([] as Array<{ id: bigint; uid: string }>),
      existingPlatformIds.length > 0
        ? tx.platform.findMany({ where: { id: { in: existingPlatformIds } }, select: { id: true, uid: true } })
        : Promise.resolve([] as Array<{ id: bigint; uid: string }>),
    ]);
    const creatorUidById = new Map(creatorUidRows.map((row) => [row.id, row.uid]));
    const platformUidById = new Map(platformUidRows.map((row) => [row.id, row.uid]));

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
      const showChanges = this.createEmptyChanges();
      relationChangesByShowId.set(showId, showChanges);
      const heldBack: HeldBackRelations = { showCreators: [], showPlatforms: [] };
      heldBackRelationsByShowId.set(showId, heldBack);
      const showActualsPopulated = showActualsById.get(showId) ?? false;

      await this.syncCreatorsForShow({
        showId,
        incoming,
        uidMaps,
        summary,
        changes: showChanges,
        heldBack,
        showActualsPopulated,
        existingCreators: showCreatorByShowId.get(showId) || [],
        creatorUidById,
      });

      await this.syncPlatformsForShow({
        showId,
        incoming,
        uidMaps,
        summary,
        changes: showChanges,
        heldBack,
        showActualsPopulated,
        existingPlatforms: showPlatformByShowId.get(showId) || [],
        platformUidById,
      });
    }

    return { relationChangesByShowId, heldBackRelationsByShowId };
  }

  private async syncCreatorsForShow(params: {
    showId: bigint;
    incoming: DiffIncomingShow;
    uidMaps: PublishingUidMaps;
    summary: PublishScheduleSummary;
    changes: ShowRelationSyncChanges;
    heldBack: HeldBackRelations;
    showActualsPopulated: boolean;
    creatorUidById: Map<bigint, string>;
    existingCreators: Array<{
      id: bigint;
      creatorId: bigint;
      note: string | null;
      deletedAt: Date | null;
      actualStartTime: Date | null;
      actualEndTime: Date | null;
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

      if (!existing || existing.deletedAt) {
        // Additions and restores of a soft-deleted row always apply — nothing active to conflict with.
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
        } else {
          await tx.showCreator.update({
            where: { id: existing.id },
            data: { deletedAt: null, note: incomingCreator.note, metadata: {} },
          });
        }
        params.summary.creator_links_added += 1;
        params.changes.creator_links_added += 1;
        continue;
      }

      if ((existing.note || null) === (incomingCreator.note || null)) {
        continue;
      }

      const rowActualsPopulated = existing.actualStartTime !== null || existing.actualEndTime !== null;
      if (params.showActualsPopulated || rowActualsPopulated) {
        params.heldBack.showCreators.push({
          creatorUid: params.creatorUidById.get(creatorId) ?? '',
          action: 'update',
          oldNote: existing.note,
          newNote: incomingCreator.note ?? null,
        });
        continue;
      }

      await tx.showCreator.update({
        where: { id: existing.id },
        data: { note: incomingCreator.note },
      });
      params.summary.creator_links_updated += 1;
      params.changes.creator_links_updated += 1;
    }

    const staleCreators = params.existingCreators
      .filter((creator) => creator.deletedAt === null && !incomingCreatorById.has(creator.creatorId));

    const staleToRemove: bigint[] = [];
    for (const creator of staleCreators) {
      const rowActualsPopulated = creator.actualStartTime !== null || creator.actualEndTime !== null;
      if (params.showActualsPopulated || rowActualsPopulated) {
        params.heldBack.showCreators.push({
          creatorUid: params.creatorUidById.get(creator.creatorId) ?? '',
          action: 'remove',
          oldNote: creator.note,
          newNote: null,
        });
        continue;
      }
      staleToRemove.push(creator.id);
    }

    if (staleToRemove.length > 0) {
      await tx.showCreator.updateMany({
        where: { id: { in: staleToRemove }, deletedAt: null },
        data: { deletedAt: new Date() },
      });
      params.summary.creator_links_removed += staleToRemove.length;
      params.changes.creator_links_removed += staleToRemove.length;
    }
  }

  private async syncPlatformsForShow(params: {
    showId: bigint;
    incoming: DiffIncomingShow;
    uidMaps: PublishingUidMaps;
    summary: PublishScheduleSummary;
    changes: ShowRelationSyncChanges;
    heldBack: HeldBackRelations;
    showActualsPopulated: boolean;
    platformUidById: Map<bigint, string>;
    existingPlatforms: Array<{
      id: bigint;
      platformId: bigint;
      liveStreamLink: string | null;
      platformShowId: string | null;
      deletedAt: Date | null;
      actualStartTime: Date | null;
      actualEndTime: Date | null;
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

      if (!existing || existing.deletedAt) {
        // Additions and restores of a soft-deleted row always apply — nothing active to conflict with.
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
        } else {
          await tx.showPlatform.update({
            where: { id: existing.id },
            data: {
              deletedAt: null,
              liveStreamLink: incomingPlatform.liveStreamLink,
              platformShowId: incomingPlatform.platformShowId,
              metadata: {},
            },
          });
        }
        params.summary.platform_links_added += 1;
        params.changes.platform_links_added += 1;
        continue;
      }

      const hasChanged = (existing.liveStreamLink || null) !== (incomingPlatform.liveStreamLink || null)
        || (existing.platformShowId || null) !== (incomingPlatform.platformShowId || null);

      if (!hasChanged) {
        continue;
      }

      const rowActualsPopulated = existing.actualStartTime !== null || existing.actualEndTime !== null;
      if (params.showActualsPopulated || rowActualsPopulated) {
        params.heldBack.showPlatforms.push({
          platformUid: params.platformUidById.get(platformId) ?? '',
          action: 'update',
          old: { liveStreamLink: existing.liveStreamLink, platformShowId: existing.platformShowId },
          new: { liveStreamLink: incomingPlatform.liveStreamLink ?? null, platformShowId: incomingPlatform.platformShowId ?? null },
        });
        continue;
      }

      await tx.showPlatform.update({
        where: { id: existing.id },
        data: {
          liveStreamLink: incomingPlatform.liveStreamLink,
          platformShowId: incomingPlatform.platformShowId,
        },
      });
      params.summary.platform_links_updated += 1;
      params.changes.platform_links_updated += 1;
    }

    const stalePlatforms = params.existingPlatforms
      .filter((platform) => platform.deletedAt === null && !incomingPlatformById.has(platform.platformId));

    const staleToRemove: bigint[] = [];
    for (const platform of stalePlatforms) {
      const rowActualsPopulated = platform.actualStartTime !== null || platform.actualEndTime !== null;
      if (params.showActualsPopulated || rowActualsPopulated) {
        params.heldBack.showPlatforms.push({
          platformUid: params.platformUidById.get(platform.platformId) ?? '',
          action: 'remove',
          old: { liveStreamLink: platform.liveStreamLink, platformShowId: platform.platformShowId },
          new: { liveStreamLink: null, platformShowId: null },
        });
        continue;
      }
      staleToRemove.push(platform.id);
    }

    if (staleToRemove.length > 0) {
      await tx.showPlatform.updateMany({
        where: { id: { in: staleToRemove }, deletedAt: null },
        data: { deletedAt: new Date() },
      });
      params.summary.platform_links_removed += staleToRemove.length;
      params.changes.platform_links_removed += staleToRemove.length;
    }
  }

  private createEmptyChanges(): ShowRelationSyncChanges {
    return {
      creator_links_added: 0,
      creator_links_updated: 0,
      creator_links_removed: 0,
      platform_links_added: 0,
      platform_links_updated: 0,
      platform_links_removed: 0,
    };
  }
}
