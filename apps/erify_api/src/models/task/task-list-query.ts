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
