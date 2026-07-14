# Infinite Query Cache Patterns — Code Examples

This file contains a complete integration example showing all three infinite query cache management patterns together: compaction on unmount, targeted active/inactive updates, and immutable page helpers.

---

## 1. Cache Helpers (Pure Utilities)

Place in `features/{feature}/lib/cache-helpers.ts`.

```typescript
import type { InfiniteData } from '@tanstack/react-query';

type Page<T> = { data: T[]; meta: { total: number; nextCursor?: string } };

/**
 * Replace an existing item in the pages, or prepend it to the first page if not found.
 * Returns a new InfiniteData — never mutates.
 */
export function upsertItemInPages<T extends { uid: string }>(
  infiniteData: InfiniteData<Page<T>>,
  item: T,
): InfiniteData<Page<T>> {
  let inserted = false;
  const pages = infiniteData.pages.map((page) => {
    const idx = page.data.findIndex((i) => i.uid === item.uid);
    if (idx === -1) return page;
    inserted = true;
    return { ...page, data: page.data.map((i) => (i.uid === item.uid ? item : i)) };
  });
  if (!inserted && pages.length > 0) {
    pages[0] = { ...pages[0]!, data: [item, ...pages[0]!.data] };
  }
  return { ...infiniteData, pages };
}

/**
 * Remove an item by uid from all pages.
 * Returns a new InfiniteData — never mutates.
 */
export function removeItemFromPages<T extends { uid: string }>(
  infiniteData: InfiniteData<Page<T>>,
  itemUid: string,
): InfiniteData<Page<T>> {
  return {
    ...infiniteData,
    pages: infiniteData.pages.map((page) => ({
      ...page,
      data: page.data.filter((i) => i.uid !== itemUid),
    })),
  };
}

/**
 * Compact to the first page only.
 * Use in useEffect cleanup so remount triggers a single revalidation instead of N.
 */
export function compactToFirstPage<T>(
  infiniteData: InfiniteData<T>,
): InfiniteData<T> {
  return {
    pages: infiniteData.pages.slice(0, 1),
    pageParams: infiniteData.pageParams.slice(0, 1),
  };
}
```

---

## 2. Feature Hook (Compaction on Unmount)

```typescript
import { useEffect, useMemo } from 'react';
import { useInfiniteQuery, useQueryClient, type InfiniteData } from '@tanstack/react-query';
import { useTableUrlState } from '@eridu/ui';
import { getTaskTemplates, taskTemplateQueryKeys } from '../api/task-templates.api';
import { compactToFirstPage } from '../lib/cache-helpers';
import type { TaskTemplateDto, PaginatedResponse } from '@eridu/api-types';

export function useTaskTemplates({ studioId }: { studioId: string }) {
  const queryClient = useQueryClient();

  const tableState = useTableUrlState({
    from: '/studios/$studioId/task-templates',
    searchColumnId: 'name',
  });

  const searchQuery =
    (tableState.columnFilters.find((f) => f.id === 'name')?.value as string) || '';

  // Memoize so it's stable for the useEffect dependency array
  const listQueryKey = useMemo(
    () => taskTemplateQueryKeys.list(studioId, { search: searchQuery }),
    [studioId, searchQuery],
  );

  const query = useInfiniteQuery({
    queryKey: listQueryKey,
    queryFn: ({ pageParam, signal }) =>
      getTaskTemplates(studioId, { cursor: pageParam, limit: 20, name: searchQuery }, { signal }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.meta.nextCursor,
  });

  // Compact cache on unmount — prevents N-page burst revalidation on remount
  useEffect(() => {
    return () => {
      queryClient.setQueryData<InfiniteData<PaginatedResponse<TaskTemplateDto>>>(
        listQueryKey,
        (data) => (data ? compactToFirstPage(data) : data),
      );
    };
  }, [listQueryKey, queryClient]);

  const items = useMemo(
    () => query.data?.pages.flatMap((page) => page.data) ?? [],
    [query.data],
  );

  return {
    tableState,
    items,
    total: query.data?.pages[0]?.meta.total ?? 0,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    isFetchingNextPage: query.isFetchingNextPage,
    hasNextPage: query.hasNextPage,
    fetchNextPage: query.fetchNextPage,
    refetch: query.refetch,
  };
}
```

---

## 3. Mutations with Targeted Active/Inactive Updates

```typescript
import { useMutation, useQueryClient, type InfiniteData } from '@tanstack/react-query';
import { taskTemplateQueryKeys, updateTaskTemplate, deleteTaskTemplate } from '../api/task-templates.api';
import { upsertItemInPages, removeItemFromPages } from '../lib/cache-helpers';
import type { TaskTemplateDto, PaginatedResponse, UpdateTaskTemplateDto } from '@eridu/api-types';

type Page = PaginatedResponse<TaskTemplateDto>;

export function useUpdateTaskTemplate(studioId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ templateId, data }: { templateId: string; data: UpdateTaskTemplateDto }) =>
      updateTaskTemplate(studioId, templateId, data),
    onSuccess: (updatedTemplate) => {
      // 1. Patch active queries immediately — zero perceived latency
      queryClient.setQueriesData<InfiniteData<Page>>(
        { queryKey: taskTemplateQueryKeys.listPrefix(studioId), type: 'active' },
        (data) => (data ? upsertItemInPages(data, updatedTemplate) : data),
      );
      // 2. Invalidate inactive queries — they'll refetch when next viewed
      void queryClient.invalidateQueries({
        queryKey: taskTemplateQueryKeys.listPrefix(studioId),
        type: 'inactive',
      });
      // 3. Update the detail cache entry
      queryClient.setQueryData(
        taskTemplateQueryKeys.detail(updatedTemplate.uid),
        updatedTemplate,
      );
    },
  });
}

export function useDeleteTaskTemplate(studioId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (templateId: string) => deleteTaskTemplate(studioId, templateId),
    onSuccess: (_, templateId) => {
      // 1. Remove from active queries immediately
      queryClient.setQueriesData<InfiniteData<Page>>(
        { queryKey: taskTemplateQueryKeys.listPrefix(studioId), type: 'active' },
        (data) => (data ? removeItemFromPages(data, templateId) : data),
      );
      // 2. Invalidate inactive queries
      void queryClient.invalidateQueries({
        queryKey: taskTemplateQueryKeys.listPrefix(studioId),
        type: 'inactive',
      });
      // 3. Remove detail entry
      queryClient.removeQueries({
        queryKey: taskTemplateQueryKeys.detail(templateId),
      });
    },
  });
}
```

---

## 4. Manual Refresh with Pre-Compaction

When the user presses the refresh button, compact first so the refetch only fetches page 1:

```typescript
const handleRefresh = useCallback(() => {
  // Compact before refetch — avoids re-fetching all accumulated pages
  queryClient.setQueryData<InfiniteData<Page>>(
    listQueryKey,
    (data) => (data ? compactToFirstPage(data) : data),
  );
  void query.refetch();
}, [listQueryKey, query, queryClient]);
```

Pass `handleRefresh` as `onRefresh` to the toolbar instead of the raw `query.refetch`.

---

## Key Rules Summary

| Pattern | When to use |
|---------|-------------|
| `compactToFirstPage` in `useEffect` cleanup | Always — on every infinite list hook |
| `setQueriesData` with `type: 'active'` | Mutations that update or delete items |
| `invalidateQueries` with `type: 'inactive'` | Companion to active update — keeps stale caches fresh on next view |
| Pre-compact before `refetch` | Manual refresh button handler |
| `upsertItemInPages` | Create or update mutations |
| `removeItemFromPages` | Delete mutations |
