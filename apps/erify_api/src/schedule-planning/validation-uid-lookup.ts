import type { Prisma } from '@prisma/client';

import type { ShowPlanItem } from './schemas/schedule-planning.schema';

import type { PrismaService } from '@/prisma/prisma.service';

export type ValidationUidMaps = {
  clients: Map<string, bigint>;
  studioRooms: Map<string, bigint>;
  showTypes: Map<string, bigint>;
  showStatuses: Map<string, bigint>;
  showStandards: Map<string, bigint>;
  creators: Map<string, bigint>;
  platforms: Map<string, bigint>;
  existingShows: Map<string, bigint>;
};

export type SchedulePlanningPrismaClient = Prisma.TransactionClient | PrismaService;

export function getCreatorAssignments(
  show: ShowPlanItem,
): Array<{ creatorId: string; note?: string }> {
  return show.creators || [];
}

export async function buildValidationUidLookupMaps(
  shows: ShowPlanItem[],
  prismaClient: SchedulePlanningPrismaClient,
): Promise<ValidationUidMaps> {
  const clientUids = new Set<string>();
  const studioRoomUids = new Set<string>();
  const showTypeUids = new Set<string>();
  const showStatusUids = new Set<string>();
  const showStandardUids = new Set<string>();
  const creatorUids = new Set<string>();
  const platformUids = new Set<string>();
  const existingShowIds = new Set<string>();

  shows.forEach((show) => {
    show.clientId && clientUids.add(show.clientId);
    show.studioRoomId && studioRoomUids.add(show.studioRoomId);
    show.showTypeId && showTypeUids.add(show.showTypeId);
    show.showStatusId && showStatusUids.add(show.showStatusId);
    show.showStandardId && showStandardUids.add(show.showStandardId);
    getCreatorAssignments(show).forEach((creator) =>
      creator.creatorId && creatorUids.add(creator.creatorId),
    );
    (show.platforms || []).forEach((platform) =>
      platform.platformId && platformUids.add(platform.platformId),
    );
    show.existingShowId && existingShowIds.add(show.existingShowId);
  });

  const [
    clients,
    studioRooms,
    showTypes,
    showStatuses,
    showStandards,
    creators,
    platforms,
    existingShows,
  ] = await Promise.all([
    prismaClient.client.findMany({
      where: { uid: { in: Array.from(clientUids) }, deletedAt: null },
      select: { id: true, uid: true },
    }),
    prismaClient.studioRoom.findMany({
      where: { uid: { in: Array.from(studioRoomUids) }, deletedAt: null },
      select: { id: true, uid: true },
    }),
    prismaClient.showType.findMany({
      where: { uid: { in: Array.from(showTypeUids) }, deletedAt: null },
      select: { id: true, uid: true },
    }),
    prismaClient.showStatus.findMany({
      where: { uid: { in: Array.from(showStatusUids) }, deletedAt: null },
      select: { id: true, uid: true },
    }),
    prismaClient.showStandard.findMany({
      where: { uid: { in: Array.from(showStandardUids) }, deletedAt: null },
      select: { id: true, uid: true },
    }),
    prismaClient.creator.findMany({
      where: { uid: { in: Array.from(creatorUids) }, deletedAt: null },
      select: { id: true, uid: true },
    }),
    prismaClient.platform.findMany({
      where: { uid: { in: Array.from(platformUids) }, deletedAt: null },
      select: { id: true, uid: true },
    }),
    prismaClient.show.findMany({
      where: { uid: { in: Array.from(existingShowIds) }, deletedAt: null },
      select: { id: true, uid: true },
    }),
  ]);

  return {
    clients: new Map(clients.map((c) => [c.uid, c.id])),
    studioRooms: new Map(studioRooms.map((r) => [r.uid, r.id])),
    showTypes: new Map(showTypes.map((t) => [t.uid, t.id])),
    showStatuses: new Map(showStatuses.map((s) => [s.uid, s.id])),
    showStandards: new Map(showStandards.map((s) => [s.uid, s.id])),
    creators: new Map(creators.map((creator) => [creator.uid, creator.id])),
    platforms: new Map(platforms.map((p) => [p.uid, p.id])),
    existingShows: new Map(existingShows.map((s) => [s.uid, s.id])),
  };
}
