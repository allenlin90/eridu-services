import type { Prisma, Task, TaskTemplateSnapshot } from '@prisma/client';

export type TaskShowCreatorTarget = {
  uid: string;
  creator: { name: string; aliasName: string };
};

export type TaskShowPlatformTarget = {
  uid: string;
  platform: { name: string };
};

export type TaskWithSnapshotTargets = Task & {
  template: { uid: string; name: string } | null;
  snapshot: TaskTemplateSnapshot | null;
  targets: {
    show: {
      id: bigint;
      uid: string;
      externalId: string | null;
      studioId: bigint | null;
      startTime: Date;
      endTime: Date;
      client: { name: string } | null;
      showCreators: TaskShowCreatorTarget[];
      showPlatforms: TaskShowPlatformTarget[];
    } | null;
  }[];
};

export type TaskWithRelations = Task & {
  template: { uid: string; name: string } | null;
  snapshot: { schema: unknown; version: number } | null;
  assignee: { uid: string; name: string } | null;
  targets: {
    show: {
      uid: string;
      name: string;
      startTime: Date;
      endTime: Date;
      client: { name: string } | null;
      studioRoom: { name: string } | null;
      showCreators: TaskShowCreatorTarget[];
      showPlatforms: TaskShowPlatformTarget[];
    } | null;
  }[];
};

const showHydrationTargetSelect = {
  showCreators: {
    where: { deletedAt: null },
    select: {
      uid: true,
      creator: {
        select: {
          name: true,
          aliasName: true,
        },
      },
    },
  },
  showPlatforms: {
    where: { deletedAt: null },
    select: {
      uid: true,
      platform: {
        select: {
          name: true,
        },
      },
    },
  },
} as const;

export const taskSnapshotTargetInclude = {
  template: {
    select: {
      uid: true,
      name: true,
    },
  },
  snapshot: true,
  targets: {
    where: { targetType: 'SHOW', deletedAt: null },
    include: {
      show: {
        select: {
          id: true,
          uid: true,
          externalId: true,
          studioId: true,
          startTime: true,
          endTime: true,
          client: {
            select: {
              name: true,
            },
          },
          ...showHydrationTargetSelect,
        },
      },
    },
  },
} satisfies Prisma.TaskInclude;

export const taskRelationInclude = {
  template: true,
  snapshot: {
    select: {
      schema: true,
      version: true,
    },
  },
  assignee: true,
  targets: {
    where: { targetType: 'SHOW', deletedAt: null },
    include: {
      show: {
        include: {
          client: {
            select: {
              name: true,
            },
          },
          studioRoom: {
            select: {
              name: true,
            },
          },
          ...showHydrationTargetSelect,
        },
      },
    },
  },
} satisfies Prisma.TaskInclude;
