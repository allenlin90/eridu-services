import type { Prisma } from '@prisma/client';

import type { ListMyTasksQueryTransformed } from '@eridu/api-types/task-management';

type TaskListScope = {
  assigneeId?: bigint;
  studioId?: bigint;
};

export const taskListInclude = {
  template: true,
  snapshot: {
    select: {
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
              uid: true,
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
          showPlatforms: {
            where: { deletedAt: null },
            select: {
              uid: true,
              platform: {
                select: {
                  uid: true,
                  name: true,
                },
              },
            },
          },
        },
      },
    },
  },
} satisfies Prisma.TaskInclude;

/**
 * Member-facing task lists (e.g. GET /me/tasks) render the execution form
 * inline from the snapshot schema, so they must carry it. The studio review
 * list deliberately omits the (large) JSONB schema and lazy-loads it via the
 * task detail endpoint instead — see {@link taskListInclude}.
 */
export const taskListIncludeWithSchema = {
  ...taskListInclude,
  snapshot: {
    select: {
      version: true,
      schema: true,
    },
  },
} satisfies Prisma.TaskInclude;

/**
 * Date scope for the review queue stats: a task counts when its due date falls
 * in range, OR when it has no due date but is attached to a show that starts in
 * range. Mirrors the dated + undated passes the review summary used to fetch
 * separately, so undated review tasks are not dropped from the tab counts.
 */
export function buildReviewStatsDateScope(
  dueDateFrom?: string,
  dueDateTo?: string,
): Prisma.TaskWhereInput | null {
  if (!dueDateFrom && !dueDateTo) {
    return null;
  }

  const dueDateFilter: Prisma.DateTimeFilter = {};
  const showStartFilter: Prisma.DateTimeFilter = {};
  if (dueDateFrom) {
    dueDateFilter.gte = new Date(dueDateFrom);
    showStartFilter.gte = new Date(dueDateFrom);
  }
  if (dueDateTo) {
    dueDateFilter.lte = new Date(dueDateTo);
    showStartFilter.lte = new Date(dueDateTo);
  }

  return {
    OR: [
      { dueDate: dueDateFilter },
      {
        dueDate: null,
        targets: {
          some: {
            targetType: 'SHOW',
            deletedAt: null,
            show: { startTime: showStartFilter },
          },
        },
      },
    ],
  };
}

export function buildTaskListWhere(
  query: ListMyTasksQueryTransformed,
): Prisma.TaskWhereInput;
export function buildTaskListWhere(
  query: ListMyTasksQueryTransformed,
  scope: TaskListScope,
): Prisma.TaskWhereInput | null;
export function buildTaskListWhere(
  query: ListMyTasksQueryTransformed,
  scope: TaskListScope = {},
): Prisma.TaskWhereInput | null {
  const {
    status,
    task_type,
    has_assignee,
    has_due_date,
    due_date_from,
    due_date_to,
    show_start_from,
    show_start_to,
    studio_name,
    client_name,
    assignee_name,
    show_name,
    search,
    reference_id,
    studio_id,
    client_id,
    platform_id,
    review_tab,
  } = query;

  const where: Prisma.TaskWhereInput = {
    deletedAt: null,
  };

  if (scope.assigneeId) {
    where.assigneeId = scope.assigneeId;
  }

  if (scope.studioId) {
    where.studioId = scope.studioId;
  } else if (!scope.assigneeId && studio_id) {
    where.studio = { uid: studio_id };
  }

  if (status) {
    where.status = Array.isArray(status) ? { in: status } : status;
  }

  if (task_type) {
    where.type = Array.isArray(task_type) ? { in: task_type } : task_type;
  }

  if (scope.assigneeId) {
    // /me/tasks is already scoped to the authenticated assignee.
    if (has_assignee === false) {
      return null;
    }
  } else if (has_assignee === true) {
    where.assigneeId = { not: null };
  } else if (has_assignee === false) {
    where.assigneeId = null;
  }

  applyDueDateFilter(where, {
    hasDueDate: has_due_date,
    dueDateFrom: due_date_from,
    dueDateTo: due_date_to,
  });

  if (show_start_from || show_start_to) {
    const showStartTimeFilter: Prisma.DateTimeFilter = {};
    if (show_start_from)
      showStartTimeFilter.gte = new Date(show_start_from);
    if (show_start_to)
      showStartTimeFilter.lte = new Date(show_start_to);

    where.targets = {
      some: {
        targetType: 'SHOW',
        deletedAt: null,
        show: {
          startTime: showStartTimeFilter,
        },
      },
    };
  }

  if (studio_name) {
    appendAndFilter(where, {
      studio: {
        name: { contains: studio_name, mode: 'insensitive' },
      },
    });
  }

  if (client_name) {
    appendAndFilter(where, {
      targets: {
        some: {
          targetType: 'SHOW',
          deletedAt: null,
          show: {
            client: {
              name: { contains: client_name, mode: 'insensitive' },
            },
          },
        },
      },
    });
  }

  if (assignee_name) {
    appendAndFilter(where, {
      assignee: {
        name: { contains: assignee_name, mode: 'insensitive' },
      },
    });
  }

  if (show_name) {
    appendAndFilter(where, {
      targets: {
        some: {
          targetType: 'SHOW',
          deletedAt: null,
          show: {
            name: { contains: show_name, mode: 'insensitive' },
          },
        },
      },
    });
  }

  if (client_id) {
    appendAndFilter(where, {
      targets: {
        some: {
          targetType: 'SHOW',
          deletedAt: null,
          show: {
            client: {
              uid: client_id,
            },
          },
        },
      },
    });
  }

  if (platform_id) {
    appendAndFilter(where, {
      targets: {
        some: {
          targetType: 'SHOW',
          deletedAt: null,
          show: {
            showPlatforms: {
              some: {
                deletedAt: null,
                platform: { uid: platform_id },
              },
            },
          },
        },
      },
    });
  }

  if (search) {
    where.OR = [
      { uid: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
      { assignee: { uid: { contains: search, mode: 'insensitive' } } },
      { assignee: { name: { contains: search, mode: 'insensitive' } } },
      {
        targets: {
          some: {
            targetType: 'SHOW',
            deletedAt: null,
            show: {
              uid: { contains: search, mode: 'insensitive' },
            },
          },
        },
      },
      {
        targets: {
          some: {
            targetType: 'SHOW',
            deletedAt: null,
            show: {
              name: { contains: search, mode: 'insensitive' },
            },
          },
        },
      },
    ];
  }

  if (reference_id) {
    appendAndFilter(where, {
      OR: [
        { assignee: { uid: { contains: reference_id, mode: 'insensitive' } } },
        {
          targets: {
            some: {
              targetType: 'SHOW',
              deletedAt: null,
              show: {
                uid: { contains: reference_id, mode: 'insensitive' },
              },
            },
          },
        },
      ],
    });
  }

  if (review_tab) {
    applyReviewTabFilter(where, review_tab);
  }

  return where;
}

export function buildTaskListOrderBy(
  sort: ListMyTasksQueryTransformed['sort'],
): Prisma.TaskOrderByWithRelationInput {
  if (!sort) {
    return { dueDate: 'asc' };
  }

  const [field, direction] = sort.split(':');
  const sortDirection = direction === 'desc' ? 'desc' : 'asc';

  if (field === 'due_date') {
    return { dueDate: sortDirection };
  }

  if (field === 'updated_at' || field === 'updatedAt') {
    return { updatedAt: sortDirection };
  }

  if (field === 'createdAt' || field === 'created_at') {
    return { createdAt: sortDirection };
  }

  return { dueDate: 'asc' };
}

function applyDueDateFilter(
  where: Prisma.TaskWhereInput,
  params: {
    hasDueDate?: boolean;
    dueDateFrom?: ListMyTasksQueryTransformed['due_date_from'];
    dueDateTo?: ListMyTasksQueryTransformed['due_date_to'];
  },
): void {
  if (params.hasDueDate === false) {
    where.dueDate = null;
    return;
  }

  if (params.hasDueDate === true) {
    if (params.dueDateFrom || params.dueDateTo) {
      where.dueDate = {};
      if (params.dueDateFrom)
        where.dueDate.gte = new Date(params.dueDateFrom);
      if (params.dueDateTo)
        where.dueDate.lte = new Date(params.dueDateTo);
    } else {
      where.dueDate = { not: null };
    }
    return;
  }

  if (params.dueDateFrom || params.dueDateTo) {
    where.dueDate = {};
    if (params.dueDateFrom)
      where.dueDate.gte = new Date(params.dueDateFrom);
    if (params.dueDateTo)
      where.dueDate.lte = new Date(params.dueDateTo);
  }
}

function appendAndFilter(
  where: Prisma.TaskWhereInput,
  filter: Prisma.TaskWhereInput,
): void {
  const existingAnd = where.AND
    ? Array.isArray(where.AND)
      ? where.AND
      : [where.AND]
    : [];
  where.AND = [...existingAnd, filter];
}

function applyReviewTabFilter(
  where: Prisma.TaskWhereInput,
  tab: string,
): void {
  const now = new Date();

  // 1. Resolve phase based on tab prefix
  if (tab.startsWith('pre-prod-')) {
    where.type = 'SETUP';
  } else if (tab.startsWith('post-prod-')) {
    where.type = 'CLOSURE';
  } else if (tab.startsWith('on-air-')) {
    where.type = { in: ['ACTIVE', 'ADMIN', 'ROUTINE', 'OTHER'] };
  }

  // 2. Resolve issues/status based on tab suffix or name
  if (tab === 'ready' || tab.endsWith('-ready')) {
    where.status = 'REVIEW';
    where.assigneeId = { not: null };
  } else if (tab === 'attention' || tab.endsWith('-attention')) {
    where.status = { notIn: ['COMPLETED', 'CLOSED'] };
    const existingAnd = where.AND
      ? Array.isArray(where.AND)
        ? where.AND
        : [where.AND]
      : [];
    where.AND = [
      ...existingAnd,
      {
        OR: [
          { assigneeId: null },
          {
            AND: [
              { status: { not: 'REVIEW' } },
              { dueDate: { lt: now } },
            ],
          },
        ],
      },
    ];
  } else if (tab === 'done' || tab.endsWith('-done')) {
    where.status = { in: ['COMPLETED', 'CLOSED'] };
  }
}

/**
 * The review-stats tab keys (as returned to the API) mapped to the tab string
 * understood by `applyReviewTabFilter`. `total` has no per-tab filter (the base
 * scope only). Reusing `applyReviewTabFilter` keeps the stats counts and the
 * list-view tab filtering on one definition.
 */
const REVIEW_STATS_TABS = {
  total: '',
  ready: 'ready',
  attention: 'attention',
  done: 'done',
  preProdAttentionCount: 'pre-prod-attention',
  preProdReadyCount: 'pre-prod-ready',
  preProdDoneCount: 'pre-prod-done',
  onAirAttentionCount: 'on-air-attention',
  onAirReadyCount: 'on-air-ready',
  onAirDoneCount: 'on-air-done',
  postProdAttentionCount: 'post-prod-attention',
  postProdReadyCount: 'post-prod-ready',
  postProdDoneCount: 'post-prod-done',
} as const;

export type ReviewStatsTab = keyof typeof REVIEW_STATS_TABS;

/**
 * Builds the per-tab `where` criteria for the review-stats counts. Scopes by
 * "dated-in-range OR undated-with-show-in-range" (so review tasks without a due
 * date are still counted), then derives each tab's filter via the shared
 * `applyReviewTabFilter`. Pure: returns one `TaskWhereInput` per tab for the
 * repository to count. `applyReviewTabFilter` only reassigns top-level keys, so
 * a shallow clone of the base scope per tab is sufficient isolation.
 */
export function buildReviewStatsTabCriteria(
  query: ListMyTasksQueryTransformed,
): Record<ReviewStatsTab, Prisma.TaskWhereInput> {
  const { due_date_from, due_date_to, ...rest } = query;
  const baseWhere = buildTaskListWhere(rest as ListMyTasksQueryTransformed);
  const dateScope = buildReviewStatsDateScope(due_date_from, due_date_to);
  if (dateScope) {
    appendAndFilter(baseWhere, dateScope);
  }

  const keys = Object.keys(REVIEW_STATS_TABS) as ReviewStatsTab[];
  return Object.fromEntries(
    keys.map((key) => {
      const where: Prisma.TaskWhereInput = { ...baseWhere };
      const tab = REVIEW_STATS_TABS[key];
      if (tab) {
        applyReviewTabFilter(where, tab);
      }
      return [key, where];
    }),
  ) as Record<ReviewStatsTab, Prisma.TaskWhereInput>;
}
