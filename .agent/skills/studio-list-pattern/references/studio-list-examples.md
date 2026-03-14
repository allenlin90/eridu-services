# Studio List Pattern - Code Examples

This file contains detailed code examples extracted from the main SKILL.md to keep it concise.

## Complete Feature Hook Example

```typescript
import { useInfiniteQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { useTableUrlState, type UseTableUrlStateReturn } from '@eridu/ui';
import { getTaskTemplates } from '../api/task-templates.api';
import type { TaskTemplateDto } from '@eridu/api-types';

type UseTaskTemplatesProps = {
  studioId: string;
};

type UseTaskTemplatesReturn = {
  tableState: UseTableUrlStateReturn;
  items: TaskTemplateDto[];
  total: number;
  isLoading: boolean;
  isFetching: boolean;  // ✅ IMPORTANT: Include for refresh button state
  isError: boolean;
  isFetchingNextPage: boolean;
  hasNextPage: boolean;
  fetchNextPage: () => void;
  refetch: () => void;
};

export function useTaskTemplates({ studioId }: UseTaskTemplatesProps): UseTaskTemplatesReturn {
  const tableState = useTableUrlState({
    from: '/studios/$studioId/task-templates',
    searchColumnId: 'name',
    defaultSorting: [{ id: 'updatedAt', desc: true }],
  });

  const { columnFilters } = tableState;
  const searchQuery = (columnFilters.find((f) => f.id === 'name')?.value as string) || '';

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isFetching,
    isError,
    refetch,
  } = useInfiniteQuery({
    queryKey: ['task-templates', studioId, searchQuery],
    queryFn: ({ pageParam }) =>
      getTaskTemplates(studioId, {
        limit: 20,
        name: searchQuery,
        cursor: pageParam,
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.meta.nextCursor,
  });

  const items = useMemo(
    () => data?.pages.flatMap((page) => page.data) ?? [],
    [data],
  );

  const total = data?.pages[0]?.meta.total ?? 0;

  return {
    tableState,
    items,
    total,
    isLoading,
    isFetching,
    isError,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    refetch,
  };
}
```

---

## Complete Route Component Example

```tsx
import { createFileRoute } from '@tanstack/react-router';
import { TaskTemplateCard } from '@/features/task-templates/components/task-template-card';
import { TaskTemplateToolbar } from '@/features/task-templates/components/task-template-toolbar';
import { useTaskTemplates } from '@/features/task-templates/hooks/use-task-templates';
import { useInfiniteScroll } from '@/hooks/use-infinite-scroll';
import { ResponsiveCardGrid, LoadingSpinner, EmptyState } from '@eridu/ui';

export const Route = createFileRoute('/_authenticated/studios/$studioId/task-templates/')({
  component: TaskTemplatesPage,
});

function TaskTemplatesPage() {
  const { studioId } = Route.useParams();
  const {
    tableState,
    items,
    total,
    isLoading,
    isFetching,
    isError,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    refetch,
  } = useTaskTemplates({ studioId });

  const sentinelRef = useInfiniteScroll({
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <p className="text-destructive mb-4">Failed to load task templates</p>
        <button onClick={() => refetch()}>Try again</button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Sticky Toolbar */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b px-6 py-4">
        <TaskTemplateToolbar
          tableState={tableState}
          onRefresh={refetch}
          isRefreshing={isFetching}
          studioId={studioId}
        />
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        {items.length === 0 ? (
          <EmptyState
            title="No task templates"
            description="Create your first task template to get started"
          />
        ) : (
          <>
            <div className="mb-4 text-sm text-muted-foreground">
              Showing {items.length} of {total} templates
            </div>
            <ResponsiveCardGrid>
              {items.map((template) => (
                <TaskTemplateCard key={template.uid} template={template} />
              ))}
            </ResponsiveCardGrid>
            {/* Infinite scroll sentinel */}
            <div ref={sentinelRef} className="h-10" />
            {isFetchingNextPage && (
              <div className="flex justify-center py-4">
                <LoadingSpinner />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
```

---

## Complete Toolbar Component Example

```tsx
import { useNavigate } from '@tanstack/react-router';
import { MoreVertical, RotateCw, Search, Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Input,
  useDebounce,
  type UseTableUrlStateReturn,
} from '@eridu/ui';

type TaskTemplateToolbarProps = {
  tableState: UseTableUrlStateReturn;
  onRefresh: () => void;
  isRefreshing?: boolean;
  studioId: string;
};

export function TaskTemplateToolbar({
  tableState,
  onRefresh,
  isRefreshing,
  studioId,
}: TaskTemplateToolbarProps) {
  const navigate = useNavigate();
  const { columnFilters, onColumnFiltersChange } = tableState;
  const searchValue = (columnFilters.find((f) => f.id === 'name')?.value as string) || '';

  // Local state for immediate UI updates
  const [localSearch, setLocalSearch] = useState(searchValue);
  const debouncedSearch = useDebounce(localSearch, 300);

  // Sync local state with URL state
  useEffect(() => {
    setLocalSearch(searchValue);
  }, [searchValue]);

  // Update URL state when debounced value changes
  useEffect(() => {
    if (debouncedSearch !== searchValue) {
      onColumnFiltersChange((old) => {
        const newFilters = old.filter((f) => f.id !== 'name');
        if (debouncedSearch) {
          newFilters.push({ id: 'name', value: debouncedSearch });
        }
        return newFilters;
      });
    }
  }, [debouncedSearch, searchValue, onColumnFiltersChange]);

  const handleCreate = () => {
    navigate({
      to: '/studios/$studioId/task-templates/new',
      params: { studioId },
    });
  };

  return (
    <div className="flex items-center gap-2 w-full">
      {/* Search Input */}
      <div className="relative flex-1">
        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search task templates..."
          value={localSearch}
          onChange={(event) => setLocalSearch(event.target.value)}
          className="pl-8 h-9 w-full"
        />
      </div>

      <div className="flex items-center gap-2">
        {/* Desktop Actions */}
        <div className="hidden md:flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={isRefreshing}
          >
            <RotateCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={handleCreate} size="sm">
            <Plus className="mr-2 h-4 w-4" />
            Create Template
          </Button>
        </div>

        {/* Mobile Actions Dropdown */}
        <div className="md:hidden flex-none">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" className="h-9 w-9">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onRefresh} disabled={isRefreshing}>
                <RotateCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                Refresh
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleCreate}>
                <Plus className="mr-2 h-4 w-4" />
                Create Template
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}
```

---

## Complete Infinite Scroll Hook Example

```typescript
import { useEffect, useRef } from 'react';

type UseInfiniteScrollOptions = {
  fetchNextPage: () => void;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  rootMargin?: string;
  enabled?: boolean;
};

/**
 * Hook for implementing infinite scroll using Intersection Observer
 * 
 * @example
 * const sentinelRef = useInfiniteScroll({
 *   fetchNextPage,
 *   hasNextPage,
 *   isFetchingNextPage,
 * });
 * 
 * return (
 *   <>
 *     {items.map(item => <Item key={item.id} {...item} />)}
 *     <div ref={sentinelRef} />
 *   </>
 * );
 */
export function useInfiniteScroll<T extends HTMLElement = HTMLDivElement>({
  fetchNextPage,
  hasNextPage,
  isFetchingNextPage,
  rootMargin = '400px',
  enabled = true,
}: UseInfiniteScrollOptions) {
  const sentinelRef = useRef<T>(null);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasNextPage || isFetchingNextPage || !enabled) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          fetchNextPage();
        }
      },
      { rootMargin },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage, rootMargin, enabled]);

  return sentinelRef;
}
```

---

## Card Component Example

```tsx
import { Link } from '@tanstack/react-router';
import { Calendar, User } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@eridu/ui';
import type { TaskTemplateDto } from '@eridu/api-types';

type TaskTemplateCardProps = {
  template: TaskTemplateDto;
};

export function TaskTemplateCard({ template }: TaskTemplateCardProps) {
  return (
    <Link
      to="/studios/$studioId/task-templates/$templateId"
      params={{ studioId: template.studioId, templateId: template.uid }}
      className="block h-full"
    >
      <Card className="h-full hover:border-primary transition-colors cursor-pointer">
        <CardHeader>
          <CardTitle className="line-clamp-1">{template.name}</CardTitle>
          {template.description && (
            <CardDescription className="line-clamp-2">
              {template.description}
            </CardDescription>
          )}
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              <span>{new Date(template.updatedAt).toLocaleDateString()}</span>
            </div>
            {template.createdBy && (
              <div className="flex items-center gap-1">
                <User className="h-4 w-4" />
                <span>{template.createdBy.name}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
```

---

## ResponsiveCardGrid Component

```tsx
import { type ReactNode } from 'react';
import { cn } from '@eridu/ui';

type ResponsiveCardGridProps = {
  children: ReactNode;
  className?: string;
};

/**
 * Responsive grid that auto-fills columns based on available space
 * - Mobile: 1 column
 * - Tablet: 2 columns
 * - Desktop: 3-4 columns (auto-fill)
 */
export function ResponsiveCardGrid({ children, className }: ResponsiveCardGridProps) {
  return (
    <div
      className={cn(
        'grid gap-4',
        'grid-cols-1',
        'sm:grid-cols-2',
        'lg:grid-cols-[repeat(auto-fill,minmax(300px,1fr))]',
        className
      )}
    >
      {children}
    </div>
  );
}
```

---

## Feature Hook with Query Key Memoization and Cache Compaction

This example extends the basic feature hook to include:
- `useMemo` around the query key so it's stable in `useEffect` dependencies
- `useEffect` cleanup that compacts the cache to page 1 on unmount
- A `handleRefresh` that pre-compacts before calling `refetch`

```typescript
import { useCallback, useEffect, useMemo } from 'react';
import { useInfiniteQuery, useQueryClient, type InfiniteData } from '@tanstack/react-query';
import { useTableUrlState, type UseTableUrlStateReturn } from '@eridu/ui';
import { getTaskTemplates, taskTemplateQueryKeys } from '../api/task-templates.api';
import type { TaskTemplateDto, PaginatedResponse } from '@eridu/api-types';

type Page = PaginatedResponse<TaskTemplateDto>;

function compactToFirstPage<T>(data: InfiniteData<T>): InfiniteData<T> {
  return { pages: data.pages.slice(0, 1), pageParams: data.pageParams.slice(0, 1) };
}

type UseTaskTemplatesReturn = {
  tableState: UseTableUrlStateReturn;
  items: TaskTemplateDto[];
  total: number;
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
  isFetchingNextPage: boolean;
  hasNextPage: boolean;
  fetchNextPage: () => void;
  onRefresh: () => void;  // ← pre-compacts, then refetches
};

export function useTaskTemplates({ studioId }: { studioId: string }): UseTaskTemplatesReturn {
  const queryClient = useQueryClient();

  const tableState = useTableUrlState({
    from: '/studios/$studioId/task-templates',
    searchColumnId: 'name',
    defaultSorting: [{ id: 'updatedAt', desc: true }],
  });

  const searchQuery =
    (tableState.columnFilters.find((f) => f.id === 'name')?.value as string) || '';

  // Memoize — stable reference for useEffect dependency array
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

  // Compact cache to page 1 on unmount — prevents N-page burst revalidation on remount
  useEffect(() => {
    return () => {
      queryClient.setQueryData<InfiniteData<Page>>(
        listQueryKey,
        (data) => (data ? compactToFirstPage(data) : data),
      );
    };
  }, [listQueryKey, queryClient]);

  // Pre-compact then refetch — manual refresh only re-fetches page 1
  const onRefresh = useCallback(() => {
    queryClient.setQueryData<InfiniteData<Page>>(
      listQueryKey,
      (data) => (data ? compactToFirstPage(data) : data),
    );
    void query.refetch();
  }, [listQueryKey, query, queryClient]);

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
    onRefresh,
  };
}
```

**Key differences from the basic example**:
- `listQueryKey` is wrapped in `useMemo` — prevents `useEffect` from re-running on every render
- `useEffect` cleanup calls `compactToFirstPage` — single-page revalidation on remount
- `onRefresh` compacts then refetches — no burst of N requests on manual refresh
- `queryFn` destructures and passes `signal` — requests cancelled on component unmount or key change
