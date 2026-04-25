import type { Prisma, Task, TaskTemplateSnapshot } from '@prisma/client';

export type TaskWithSnapshotTargets = Task & {
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
      showCreators: { creator: { name: string; aliasName: string } }[];
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
      showCreators: { creator: { name: string; aliasName: string } }[];
    } | null;
  }[];
};

export const taskSnapshotTargetInclude = {
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
          showCreators: {
            where: { deletedAt: null },
            include: {
              creator: {
                select: {
                  name: true,
                  aliasName: true,
                },
              },
            },
          },
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
          showCreators: {
            where: { deletedAt: null },
            include: {
              creator: {
                select: {
                  name: true,
                  aliasName: true,
                },
              },
            },
          },
        },
      },
    },
  },
} satisfies Prisma.TaskInclude;
