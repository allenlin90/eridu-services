import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo } from 'react';

import { TASK_TEMPLATE_KIND, TASK_TYPE, type TaskTemplateKind, type TaskType } from '@eridu/api-types/task-management';
import { useTableUrlState } from '@eridu/ui';

import { getTaskTemplates } from '../api/get-task-templates';
import { taskTemplateQueryKeys } from '../api/task-template-query-keys';
import type { StudioTaskTemplateListRow } from '../lib/studio-task-template-list-row';
import { toStudioTaskTemplateListRow } from '../lib/studio-task-template-list-row';

const VALID_TASK_TYPES = new Set(Object.values(TASK_TYPE));
const VALID_TEMPLATE_KINDS = new Set(Object.values(TASK_TEMPLATE_KIND));

type UseTaskTemplatesProps = {
  studioId: string;
};

export function useTaskTemplates({ studioId }: UseTaskTemplatesProps) {
  const queryClient = useQueryClient();
  const {
    pagination,
    onPaginationChange,
    setPageCount,
    columnFilters,
    onColumnFiltersChange,
  } = useTableUrlState({
    from: '/studios/$studioId/task-templates',
    searchColumnId: 'name',
    defaultSorting: [{ id: 'updated_at', desc: true }],
  });

  const search = columnFilters.find((filter) => filter.id === 'name')?.value as string | undefined;
  const taskTypeValue = columnFilters.find((filter) => filter.id === 'task_type')?.value as string | undefined;
  const templateKindValue = columnFilters.find((filter) => filter.id === 'template_kind')?.value as string | undefined;
  const isActiveValue = columnFilters.find((filter) => filter.id === 'is_active')?.value as string | undefined;

  const taskType = taskTypeValue && VALID_TASK_TYPES.has(taskTypeValue as TaskType)
    ? taskTypeValue as TaskType
    : undefined;
  const templateKind = templateKindValue && VALID_TEMPLATE_KINDS.has(templateKindValue as TaskTemplateKind)
    ? templateKindValue as TaskTemplateKind
    : undefined;
  const isActive = isActiveValue === 'true'
    ? true
    : isActiveValue === 'false'
      ? false
      : undefined;

  const queryParams = useMemo(
    () => ({
      page: pagination.pageIndex + 1,
      limit: pagination.pageSize,
      name: search,
      task_type: taskType,
      template_kind: templateKind,
      is_active: isActive,
      sort: 'updated_at:desc' as const,
    }),
    [isActive, pagination.pageIndex, pagination.pageSize, search, taskType, templateKind],
  );

  const { data, isLoading, isFetching } = useQuery({
    queryKey: taskTemplateQueryKeys.list(studioId, {
      search,
      taskType,
      templateKind,
      isActive,
      page: pagination.pageIndex + 1,
      limit: pagination.pageSize,
      sort: 'updated_at:desc',
    }),
    queryFn: ({ signal }) => getTaskTemplates(studioId, queryParams, { signal }),
    placeholderData: keepPreviousData,
  });

  useEffect(() => {
    if (data?.meta?.totalPages !== undefined) {
      setPageCount(data.meta.totalPages);
    }
  }, [data?.meta?.totalPages, setPageCount]);

  const rows = useMemo<StudioTaskTemplateListRow[]>(
    () => data?.data.map(toStudioTaskTemplateListRow) ?? [],
    [data?.data],
  );

  const handleRefresh = () => {
    void queryClient.invalidateQueries({
      queryKey: taskTemplateQueryKeys.listPrefix(studioId),
    });
  };

  return {
    data: rows,
    isLoading,
    isFetching,
    pagination: data?.meta
      ? {
          pageIndex: data.meta.page - 1,
          pageSize: data.meta.limit,
          total: data.meta.total,
          pageCount: data.meta.totalPages,
        }
      : {
          pageIndex: pagination.pageIndex,
          pageSize: pagination.pageSize,
          total: 0,
          pageCount: 0,
        },
    onPaginationChange,
    columnFilters,
    onColumnFiltersChange,
    handleRefresh,
  };
}
