import type { Schedule } from '@prisma/client';

import type { ShowPlanItem } from './schemas/schedule-planning.schema';

export type ScheduleWithRelations = Schedule & {
  client: { uid: string; name: string } | null;
  studio: { uid: string; name: string } | null;
  createdByUser: { uid: string; name: string; email: string } | null;
  publishedByUser: { uid: string; name: string; email: string } | null;
};

export type DiffIncomingShow = {
  source: ShowPlanItem;
  key: string;
  clientId: bigint;
  studioId: bigint | null;
  studioRoomId: bigint | null;
  showTypeId: bigint;
  showStatusId: bigint;
  showStandardId: bigint;
};

export type ExistingShow = {
  id: bigint;
  uid: string;
  externalId: string | null;
  clientId: bigint;
  scheduleId: bigint | null;
  studioId: bigint | null;
  studioRoomId: bigint | null;
  showTypeId: bigint;
  showStatusId: bigint;
  showStandardId: bigint;
  name: string;
  startTime: Date;
  endTime: Date;
  metadata: unknown;
  deletedAt: Date | null;
  showStatus: {
    systemKey: string | null;
  };
};

export type PublishingUidMaps = {
  clients: Map<string, bigint>;
  studios: Map<string, bigint>;
  studioRooms: Map<string, bigint>;
  showTypes: Map<string, bigint>;
  showStatuses: Map<string, bigint>;
  showStandards: Map<string, bigint>;
  creators: Map<string, bigint>;
  platforms: Map<string, bigint>;
};
