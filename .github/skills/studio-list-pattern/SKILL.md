---
name: studio-list-pattern
description: Provides patterns for implementing infinite scroll lists with sticky toolbars in Erify Studios. This skill should be used when building studio-scoped list pages with card-based layouts, debounced search, and cursor-based pagination.
---

# Studio List Pattern

This skill outlines the standard pattern for implementing infinite scroll lists in the `erify_studios` application. Unlike admin lists (which use server-side pagination with tables), studio lists use cursor-based pagination with card grids.

## Pattern Overview

Studio lists combine several patterns:
1. **Infinite Scroll**: Cursor-based pagination with Intersection Observer
2. **Sticky Toolbar**: Search and actions remain accessible while scrolling
3. **Responsive Actions**: Desktop buttons collapse to mobile dropdown
4. **Debounced Search**: Local state with URL synchronization
5. **Card-Based Layout**: Responsive grid instead of tables

---

## Architecture

```
Route Component (index.tsx)
├─ useTaskTemplates() hook          → Owns all query state
├─ Sticky Toolbar                   → Search + Actions
├─ ResponsiveCardGrid               → Auto-fill grid layout
│  └─ Card components                → Individual items
└─ useInfiniteScroll() sentinel     → Triggers fetchNextPage
```

---

## Implementation Steps

### 1. Create Feature Hook

The hook owns all query state and exposes both data and refetching states.

**Pattern**: `features/{feature}/hooks/use-{feature}.ts`

```typescript
import { useInfiniteQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { useTableUrlState, type UseTableUrlStateReturn } from '@eridu/ui';

type UseFeatureProps = {
  studioId: string;
};

type UseFeatureReturn = {
  tableState: UseTableUrlStateReturn;
  items: ItemDto[];
  total: number;
  isLoading: boolean;
  isFetching: boolean;  // ✅ IMPORTANT: Include for refresh button state
  isError: boolean;
  isFetchingNextPage: boolean;
  hasNextPage: boolean;
  fetchNextPage: () => void;
  refetch: () => void;
};

export function useFeature({ studioId }: UseFeatureProps): UseFeatureReturn {
  const tableState = useTableUrlState({
    from: '/studios/$studioId/feature',
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
    queryKey: ['feature', studioId, searchQuery],
    queryFn: ({ pageParam }) =>
      getItems(studioId, {
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
    isFetching,  // ✅ Expose for refresh button
    isError,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    refetch,
  };
}
```

**Key Points**:
- Use `useTableUrlState` for URL synchronization
- Extract search query from `columnFilters`
- Use `useInfiniteQuery` with cursor-based pagination
- Flatten pages with `useMemo` for performance
- **Always expose `isFetching`** for refresh button state

---

### 2. Create Route Component with Sticky Toolbar

**Pattern**: `routes/studios/$studioId/{feature}/index.tsx`

```tsx
import { createFileRoute } from '@tanstack/react-router';
import { FeatureList } from '@/features/feature/components/feature-list';
import { FeatureToolbar } from '@/features/feature/components/feature-toolbar';
import { useFeature } from '@/features/feature/hooks/use-feature';

export const Route = createFileRoute('/studios/$studioId/feature/')({
  component: FeaturePage,
});

function FeaturePage() {
  const { studioId } = Route.useParams();
  const {
    tableState,
    items,
    isLoading,
    isFetching,
    isError,
    refetch,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = useFeature({ studioId });

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      {/* Header - scrolls normally */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Feature Title</h1>
        <p className="text-muted-foreground">
          Description of the feature.
        </p>
      </div>

      {/* Toolbar - sticky with backdrop blur */}
      <div className="sticky top-0 z-10 -mx-4 px-4 py-2 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <FeatureToolbar
          tableState={tableState}
          onRefresh={refetch}
          isRefreshing={isFetching}  // ✅ Use isFetching, not isLoading || isFetchingNextPage
          studioId={studioId}
        />
      </div>

      {/* List - scrolls */}
      <FeatureList
        items={items}
        isLoading={isLoading}
        isError={isError}
        hasNextPage={hasNextPage}
        isFetchingNextPage={isFetchingNextPage}
        fetchNextPage={fetchNextPage}
      />
    </div>
  );
}
```

**Sticky Toolbar CSS Breakdown**:
- `sticky top-0 z-10`: Stick to top of scroll container
- `-mx-4 px-4`: Negative margin extends to parent edges, padding brings content back
- `bg-background/95 backdrop-blur`: Semi-transparent background with blur
- `supports-[backdrop-filter]:bg-background/60`: More transparent when blur is supported

**Why `top-0`?**
- The `SidebarInset` container handles its own scroll context
- The sidebar header is outside the main content scroll area
- Content padding starts after the header, so `top-0` aligns with content area top

---

### 3. Create Toolbar Component with Responsive Actions

**Pattern**: `features/{feature}/components/{feature}-toolbar.tsx`

```tsx
import { useNavigate } from '@tanstack/react-router';
import { MoreVertical, RotateCw, Search } from 'lucide-react';
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

type FeatureToolbarProps = {
  tableState: UseTableUrlStateReturn;
  onRefresh: () => void;
  isRefreshing?: boolean;
  studioId: string;
};

export function FeatureToolbar({
  tableState,
  onRefresh,
  isRefreshing,
  studioId,
}: FeatureToolbarProps) {
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
      to: '/studios/$studioId/feature/new',
      params: { studioId },
    });
  };

  return (
    <div className="flex items-center gap-2 w-full">
      <div className="relative flex-1">
        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search..."
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
            Create New
          </Button>
        </div>

        {/* Mobile Actions Dropdown */}
        <div className="md:hidden flex-none">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" className="h-9 w-9">
                <MoreVertical className="h-4 w-4" />
                <span className="sr-only">Actions</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onRefresh} disabled={isRefreshing}>
                <RotateCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                Refresh
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleCreate}>
                Create New
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}
```

**Responsive Pattern**:
- Desktop (≥768px): Show all buttons inline
- Mobile (<768px): Collapse to `MoreVertical` (⋮) dropdown
- Use `md:` breakpoint for consistency

**Debounce Pattern**:
- Local state (`localSearch`) for immediate UI updates
- Debounced value (`debouncedSearch`) syncs to URL
- 300ms debounce timeout (balance between responsiveness and API calls)

---

### 4. Create List Component with Infinite Scroll

**Pattern**: `features/{feature}/components/{feature}-list.tsx`

```tsx
import { AlertCircle } from 'lucide-react';
import type { ItemDto } from '@eridu/api-types';
import { Spinner } from '@eridu/ui';
import { ItemCard } from './item-card';
import { ResponsiveCardGrid } from '@/components/responsive-card-grid';
import { useInfiniteScroll } from '@/hooks/use-infinite-scroll';

export type FeatureListProps = {
  items: ItemDto[];
  isLoading: boolean;
  isError?: boolean;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => void;
};

export function FeatureList({
  items,
  isLoading,
  isError,
  hasNextPage,
  isFetchingNextPage,
  fetchNextPage,
}: FeatureListProps) {
  const sentinelRef = useInfiniteScroll({
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  });

  if (isLoading) {
    return (
      <ResponsiveCardGrid>
        {['s1', 's2', 's3', 's4', 's5', 's6', 's7', 's8'].map((id) => (
          <div
            key={id}
            className="h-[200px] border rounded-lg bg-muted/20 animate-pulse"
          />
        ))}
      </ResponsiveCardGrid>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center p-12 border-2 border-destructive/50 rounded-lg text-center">
        <AlertCircle className="h-12 w-12 text-destructive mb-4" />
        <h3 className="text-lg font-semibold text-destructive mb-2">
          Failed to load items
        </h3>
        <p className="text-sm text-muted-foreground">
          There was an error loading the items. Please try refreshing the page.
        </p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed rounded-lg text-center">
        <h3 className="mt-2 text-xl font-semibold">No items found</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Create a new item to get started.
        </p>
      </div>
    );
  }

  return (
    <>
      <ResponsiveCardGrid>
        {items.map((item) => (
          <ItemCard key={item.id} item={item} />
        ))}
      </ResponsiveCardGrid>

      {/* Infinite scroll sentinel */}
      <div ref={sentinelRef} className="h-4" />

      {isFetchingNextPage && (
        <div className="flex justify-center py-4">
          <Spinner className="h-6 w-6" />
        </div>
      )}
    </>
  );
}
```

**State Handling**:
- `isLoading`: Initial load → Show skeleton cards
- `isError`: Error state → Show error message with icon
- `items.length === 0`: Empty state → Show empty message
- `isFetchingNextPage`: Loading more → Show spinner at bottom

---

## Shared Components

### ResponsiveCardGrid

**Location**: `apps/erify_studios/src/components/responsive-card-grid.tsx`

```tsx
import type { ReactNode } from 'react';
import { cn } from '@eridu/ui/lib/utils';

export type ResponsiveCardGridProps = {
  children: ReactNode;
  minCardWidth?: string;
  gap?: string;
  className?: string;
};

export function ResponsiveCardGrid({
  children,
  minCardWidth = '280px',
  gap = '1.5rem',
  className,
}: ResponsiveCardGridProps) {
  return (
    <div
      className={cn('grid', className)}
      style={{
        gridTemplateColumns: `repeat(auto-fill, minmax(min(100%, ${minCardWidth}), 1fr))`,
        gap,
      }}
    >
      {children}
    </div>
  );
}
```

**How it works**:
- `auto-fill`: Creates as many columns as fit
- `minmax(min(100%, 280px), 1fr)`: Cards are at least 280px, but never wider than container
- No media queries needed - fully responsive

---

### useInfiniteScroll Hook

**Location**: `apps/erify_studios/src/hooks/use-infinite-scroll.ts`

```tsx
import { useEffect, useRef } from 'react';

export type UseInfiniteScrollOptions = {
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => void;
  rootMargin?: string;
  enabled?: boolean;
};

export function useInfiniteScroll<T extends HTMLElement = HTMLDivElement>({
  hasNextPage,
  isFetchingNextPage,
  fetchNextPage,
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

**How it works**:
- Attach ref to sentinel element (empty div at bottom of list)
- When sentinel enters viewport (with 400px margin), trigger `fetchNextPage`
- Automatically cleanup on unmount

---

## Query State Ownership Principle

> [!IMPORTANT]
> Feature hooks own all query state. UI components receive callbacks, not query internals.

**✅ GOOD**:
```tsx
// Hook owns query, exposes both data and refetching state
function useFeature({ studioId }) {
  const query = useInfiniteQuery({ ... });
  return {
    items: ...,
    isLoading: query.isLoading,
    isFetching: query.isFetching,  // ✅ Include for refresh button
    refetch: query.refetch,
  };
}

// Toolbar receives callback, doesn't know about React Query
<FeatureToolbar
  onRefresh={refetch}
  isRefreshing={isFetching}  // ✅ Use isFetching
/>
```

**❌ BAD**:
```tsx
// Layout component using useIsFetching
function PageLayout({ refreshQueryKey }) {
  const fetchingCount = useIsFetching({ queryKey: refreshQueryKey });
  // This couples layout to query internals
}
```

---

## Checklist

- [ ] Feature hook uses `useInfiniteQuery` with cursor pagination
- [ ] Hook exposes `isFetching` for refresh button state
- [ ] Route component uses sticky toolbar pattern with backdrop blur
- [ ] Toolbar implements responsive actions (desktop buttons → mobile dropdown)
- [ ] Toolbar uses debounced search (300ms) with local state
- [ ] List component uses `ResponsiveCardGrid` for layout
- [ ] List component uses `useInfiniteScroll` hook
- [ ] All loading, error, and empty states are handled
- [ ] Query state ownership principle is followed

---

## Related Skills

- [admin-list-pattern](../admin-list-pattern/SKILL.md) - For admin section table-based lists
- [frontend-ui-components](../frontend-ui-components/SKILL.md) - For UI component patterns
- [frontend-state-management](../frontend-state-management/SKILL.md) - For state management patterns

---

## Related Documentation

- [Task Management UI/UX Design - Section 11.5](../../../apps/erify_studios/docs/TASK_MANAGEMENT_UIUX_DESIGN.md#115-route-level-layout--sticky-toolbar-pattern)
