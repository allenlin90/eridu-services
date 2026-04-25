import type { Prisma } from '@prisma/client';

import type { ShowPlanItem } from './schemas/schedule-planning.schema';
import type {
  PublishingUidMaps,
  ScheduleWithRelations,
} from './publishing.types';

import type { PrismaService } from '@/prisma/prisma.service';

type PublishingPrismaClient = Prisma.TransactionClient | PrismaService;

export async function buildPublishingUidLookupMaps(
  shows: ShowPlanItem[],
  schedule: ScheduleWithRelations,
  tx: PublishingPrismaClient,
): Promise<PublishingUidMaps> {
  const clientUids = new Set<string>();
  const studioUids = new Set<string>();
  const studioRoomUids = new Set<string>();
  const showTypeUids = new Set<string>();
  const showStatusUids = new Set<string>();
  const showStandardUids = new Set<string>();
  const creatorUids = new Set<string>();
  const platformUids = new Set<string>();

  if (schedule.studio?.uid) {
    studioUids.add(schedule.studio.uid);
  }

  shows.forEach((show) => {
    show.clientId && clientUids.add(show.clientId);
    show.studioId && studioUids.add(show.studioId);
    show.studioRoomId && studioRoomUids.add(show.studioRoomId);
    show.showTypeId && showTypeUids.add(show.showTypeId);
    show.showStatusId && showStatusUids.add(show.showStatusId);
    show.showStandardId && showStandardUids.add(show.showStandardId);
    (show.creators || []).forEach((creator) =>
      creator.creatorId && creatorUids.add(creator.creatorId),
    );
    (show.platforms || []).forEach((platform) =>
      platform.platformId && platformUids.add(platform.platformId),
    );
  });

  const [
    clients,
    studios,
    studioRooms,
    showTypes,
    showStatuses,
    showStandards,
    creators,
    platforms,
  ] = await Promise.all([
    tx.client.findMany({
      where: { uid: { in: Array.from(clientUids) }, deletedAt: null },
      select: { id: true, uid: true },
    }),
    tx.studio.findMany({
      where: { uid: { in: Array.from(studioUids) }, deletedAt: null },
      select: { id: true, uid: true },
    }),
    tx.studioRoom.findMany({
      where: { uid: { in: Array.from(studioRoomUids) }, deletedAt: null },
      select: { id: true, uid: true },
    }),
    tx.showType.findMany({
      where: { uid: { in: Array.from(showTypeUids) }, deletedAt: null },
      select: { id: true, uid: true },
    }),
    tx.showStatus.findMany({
      where: { uid: { in: Array.from(showStatusUids) }, deletedAt: null },
      select: { id: true, uid: true },
    }),
    tx.showStandard.findMany({
      where: { uid: { in: Array.from(showStandardUids) }, deletedAt: null },
      select: { id: true, uid: true },
    }),
    tx.creator.findMany({
      where: { uid: { in: Array.from(creatorUids) }, deletedAt: null },
      select: { id: true, uid: true },
    }),
    tx.platform.findMany({
      where: { uid: { in: Array.from(platformUids) }, deletedAt: null },
      select: { id: true, uid: true },
    }),
  ]);

  return {
    clients: new Map(clients.map((c) => [c.uid, c.id])),
    studios: new Map(studios.map((s) => [s.uid, s.id])),
    studioRooms: new Map(studioRooms.map((r) => [r.uid, r.id])),
    showTypes: new Map(showTypes.map((t) => [t.uid, t.id])),
    showStatuses: new Map(showStatuses.map((s) => [s.uid, s.id])),
    showStandards: new Map(showStandards.map((s) => [s.uid, s.id])),
    creators: new Map(creators.map((creator) => [creator.uid, creator.id])),
    platforms: new Map(platforms.map((p) => [p.uid, p.id])),
  };
}
