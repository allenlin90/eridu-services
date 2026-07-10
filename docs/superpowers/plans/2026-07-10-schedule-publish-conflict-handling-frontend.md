# Actuals-Aware Conflict Handling — Frontend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give a planner in `erify_studios` a way to review and resolve `stale_conflict` rows — sheet edits the backend held back because the show already has recorded actuals — from the existing Schedule Publish Impacts page, using the validated "Review drawer" UX (right-docked sheet on desktop, bottom drawer on mobile, matching this app's existing `ResponsiveDialog` swap pattern).

**Architecture:** A new `ResponsiveSheet` component (sibling to the existing `ResponsiveDialog`, same desktop/mobile swap mechanism but Sheet-based instead of Dialog-based) hosts a new `ScheduleConflictReviewPanel` that renders the `held_back` diff and the Apply/Dismiss form. The existing `schedule-publish-impacts.tsx` route gains a `Review` action on `stale_conflict` rows, a distinct badge, and a dimmed-row treatment for resolved conflicts once applied/dismissed, per the spec's Frontend section. The shared `DataTable` component (`@eridu/ui`) has no per-row className hook today, so this plan adds one — a small, optional, additive prop with no behavior change for any existing consumer — rather than approximating the dim with cell content alone. A new mutation hook follows this app's existing resolve-mutation pattern (`useResolveShowCancellation` in `cancel-studio-show.ts`) exactly.

**Tech Stack:** React 19, TanStack Router + TanStack Query, `@eridu/ui` (Radix/shadcn), Tailwind v4, Paraglide i18n, `sonner` toasts.

**Backend contract this plan is built against** (already shipped, on the base branch — read these files yourself, don't take this summary as gospel):
- `packages/api-types/src/shows/schemas.ts` — `schedulePublishImpactRowSchema`, `heldBackPayloadSchema`, `resolveScheduleConflictSchema`.
- `apps/erify_api/src/studios/studio-show/studio-show.controller.ts` — `GET studios/:studioId/shows/schedule-publish-impacts` (existing, now also returns `stale_conflict` rows) and `POST studios/:studioId/shows/:id/schedule-publish-impacts/:conflictUid/resolve` (new — body `{ action: 'apply' | 'dismiss', reason: string }`, returns the updated `SchedulePublishImpactRow` directly, not paginated).

## Global Constraints

- `reason` is required (non-empty) for both `apply` and `dismiss` — the Apply/Dismiss buttons must stay disabled until the reason field is non-empty, matching `resolve-cancellation-dialog.tsx`'s existing pattern.
- Never expose DB internal IDs. `show_fields`' FK-backed values resolve to `{uid, name}` (`heldBackFkRefSchema`) — always render `.name`, never a raw id, there. `show_creators[].creator_uid` and `show_platforms[].platform_uid` are external UID strings with no accompanying `name` in the shipped backend contract (`heldBackCreatorEntrySchema`/`heldBackPlatformEntrySchema`) — an external UID is safe to display per this codebase's ID strategy (it's not an internal DB id), but it is not a human-readable name; track the missing display-name enrichment as tech debt rather than treating the UID itself as a leak.
- i18n: this specific route (`schedule-publish-impacts.tsx`) already uses Paraglide (`m.schedule_publish_impacts_*()`) throughout — stay consistent with it. Add new keys to `apps/erify_studios/src/i18n/messages/en.json`, don't introduce inline English into this file.
- Naming: snake_case only in raw API payload shapes (already true of `SchedulePublishImpactRow`/`HeldBackPayload`), camelCase everywhere in component/hook code.
- Match `apps/erify_studios/src/components/responsive-dialog.tsx`'s existing structure exactly when building `ResponsiveSheet` — same prop shape, same `useIsMobile` gating, same `aria-describedby` handling.
- The shared `DataTable` component (`@eridu/ui`) is used by other apps (at least `erify_creators`) — the new `getRowClassName` prop must be optional and additive; do not change existing row markup/behavior when it's omitted.
- Every changed workspace (`erify_studios`, `@eridu/ui`, and `erify_creators`'s build as a consumer check) must pass `lint`, `typecheck`, `test`, and `build` before this plan is considered done (Task 6).

---

## File Map

| File | Change |
|---|---|
| `packages/ui/src/components/data-table/data-table-core.tsx` | Add optional `getRowClassName` prop (additive, no behavior change when omitted). |
| `apps/erify_studios/src/components/responsive-sheet.tsx` | **New.** Sheet (desktop) / Drawer (mobile) swap, mirrors `responsive-dialog.tsx`. |
| `apps/erify_studios/src/features/shows/api/resolve-schedule-conflict.ts` | **New.** Mutation hook + cache-patch helper. |
| `apps/erify_studios/src/features/shows/components/schedule-conflict-review-panel.tsx` | **New.** Diff display + reason + Apply/Dismiss form. |
| `apps/erify_studios/src/features/shows/components/held-back-diff.tsx` | **New.** Pure presentational diff renderer (extracted so it's independently testable). |
| `apps/erify_studios/src/routes/studios/$studioId/schedule-publish-impacts.tsx` | Add `Review` action, `stale_conflict` badge, needs-review count, dimmed resolved-row treatment. |
| `apps/erify_studios/src/i18n/messages/en.json` | New `schedule_publish_impacts_*` and `schedule_conflict_*` keys. |
| `apps/erify_studios/src/components/__tests__/responsive-sheet.test.tsx` | **New.** |
| `apps/erify_studios/src/features/shows/components/__tests__/held-back-diff.test.tsx` | **New.** |
| `apps/erify_studios/src/features/shows/components/__tests__/schedule-conflict-review-panel.test.tsx` | **New.** |
| `apps/erify_studios/src/features/shows/api/__tests__/resolve-schedule-conflict.test.ts` | **New.** |
| `apps/erify_studios/src/routes/studios/$studioId/__tests__/schedule-publish-impacts.test.tsx` | **New.** |
| `packages/ui/src/components/data-table/__tests__/data-table-core.test.tsx` (or wherever this component's existing tests live) | Extend with a `getRowClassName` coverage case. |

---

### Task 1: `ResponsiveSheet` component

**Files:**
- Create: `apps/erify_studios/src/components/responsive-sheet.tsx`
- Test: `apps/erify_studios/src/components/__tests__/responsive-sheet.test.tsx`

**Interfaces:**
- Produces: `ResponsiveSheet` component — `{ open: boolean; onOpenChange: (open: boolean) => void; title: ReactNode; description?: ReactNode; children: ReactNode; footer?: ReactNode; contentClassName?: string; mobileBodyClassName?: string }`. Task 3 renders `ScheduleConflictReviewPanel`'s content inside this.

- [ ] **Step 1: Read the precedent file first**

Read `apps/erify_studios/src/components/responsive-dialog.tsx` in full before writing anything — this task is a structural mirror of it with `Sheet`/`SheetContent`/etc. swapped in for `Dialog`/`DialogContent`/etc. on the desktop branch. Keep the `Drawer` branch (mobile) identical to the precedent — both `ResponsiveDialog` and `ResponsiveSheet` collapse to the same bottom-drawer treatment on mobile, matching the validated UX decision ("mobile uses the panel-swap pattern already in the app").

- [ ] **Step 2: Write the component**

```tsx
import type { ReactNode } from 'react';

import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@eridu/ui';
import { useIsMobile } from '@eridu/ui/hooks/use-is-mobile';
import { cn } from '@eridu/ui/lib/utils';

type ResponsiveSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  contentClassName?: string;
  mobileBodyClassName?: string;
};

export function ResponsiveSheet({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  contentClassName,
  mobileBodyClassName,
}: ResponsiveSheetProps) {
  const isMobile = useIsMobile();
  // Same aria-describedby handling as ResponsiveDialog — see that file's comment
  // for why passing undefined vs. omitting the prop matters for Radix's warning.
  const describedByProps = description ? {} : { 'aria-describedby': undefined };

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent {...describedByProps}>
          <DrawerHeader>
            <DrawerTitle>{title}</DrawerTitle>
            {description ? <DrawerDescription>{description}</DrawerDescription> : null}
          </DrawerHeader>
          <div className={cn('max-h-[72vh] overflow-y-auto px-4', mobileBodyClassName)}>
            {children}
          </div>
          {footer ? <DrawerFooter>{footer}</DrawerFooter> : null}
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className={cn('flex flex-col sm:max-w-md', contentClassName)} {...describedByProps}>
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
          {description ? <SheetDescription>{description}</SheetDescription> : null}
        </SheetHeader>
        <div className="flex-1 overflow-y-auto px-4">
          {children}
        </div>
        {footer ? <SheetFooter>{footer}</SheetFooter> : null}
      </SheetContent>
    </Sheet>
  );
}
```

- [ ] **Step 3: Write tests**

Check how `resolve-cancellation-dialog.tsx` (or any component using `ResponsiveDialog`) is tested first — find its test file and match the exact render/query-client-wrapping setup this app's component tests use (likely React Testing Library + a `QueryClientProvider` wrapper, or none if the component itself takes no query dependency — `ResponsiveSheet` doesn't touch TanStack Query directly, so a plain RTL render should suffice). Write:

```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ResponsiveSheet } from '../responsive-sheet';

vi.mock('@eridu/ui/hooks/use-is-mobile', () => ({
  useIsMobile: vi.fn(),
}));

const { useIsMobile } = await import('@eridu/ui/hooks/use-is-mobile');

describe('responsiveSheet', () => {
  it('renders a Sheet on desktop', () => {
    vi.mocked(useIsMobile).mockReturnValue(false);
    render(
      <ResponsiveSheet open title="Review conflict" onOpenChange={() => {}}>
        <div>diff content</div>
      </ResponsiveSheet>,
    );
    expect(screen.getByText('Review conflict')).toBeInTheDocument();
    expect(screen.getByText('diff content')).toBeInTheDocument();
  });

  it('renders a Drawer on mobile', () => {
    vi.mocked(useIsMobile).mockReturnValue(true);
    render(
      <ResponsiveSheet open title="Review conflict" onOpenChange={() => {}}>
        <div>diff content</div>
      </ResponsiveSheet>,
    );
    expect(screen.getByText('Review conflict')).toBeInTheDocument();
    expect(screen.getByText('diff content')).toBeInTheDocument();
  });

  it('renders nothing when closed', () => {
    vi.mocked(useIsMobile).mockReturnValue(false);
    render(
      <ResponsiveSheet open={false} title="Review conflict" onOpenChange={() => {}}>
        <div>diff content</div>
      </ResponsiveSheet>,
    );
    expect(screen.queryByText('diff content')).not.toBeInTheDocument();
  });
});
```

(Adapt the mock syntax to whatever this project's actual Vitest mocking convention is for a named hook export — check an existing test file that mocks a hook from `@eridu/ui` or similar before assuming `vi.mock` + dynamic `await import` is the right shape; a simpler `vi.mock('@eridu/ui/hooks/use-is-mobile', () => ({ useIsMobile: () => false }))` per-test-file might be this project's actual convention — read a real example first.)

- [ ] **Step 4: Run tests, lint, typecheck**

Run: `pnpm --filter erify_studios test -- responsive-sheet.test.tsx`
Expected: PASS, 3/3

Run: `pnpm --filter erify_studios lint && pnpm --filter erify_studios typecheck`
Expected: clean

- [ ] **Step 5: Commit**

```bash
git add apps/erify_studios/src/components/responsive-sheet.tsx apps/erify_studios/src/components/__tests__/responsive-sheet.test.tsx
git commit -m "feat(erify_studios): add ResponsiveSheet (desktop sheet / mobile drawer)"
```

---

### Task 2: Resolve mutation API layer

**Files:**
- Create: `apps/erify_studios/src/features/shows/api/resolve-schedule-conflict.ts`
- Test: `apps/erify_studios/src/features/shows/api/__tests__/resolve-schedule-conflict.test.ts`

**Interfaces:**
- Consumes: `schedulePublishImpactKeys` (existing, `apps/erify_studios/src/features/shows/api/get-schedule-publish-impacts.ts`), `getMutationErrorMessage` (existing, `apps/erify_studios/src/features/studio-shows/lib/get-mutation-error-message.ts`), `apiClient` (existing, `@/lib/api/client`), `ResolveScheduleConflictInput`/`SchedulePublishImpactRow` (existing, `@eridu/api-types/shows`).
- Produces: `useResolveScheduleConflict(studioId: string)` — a mutation hook Task 3's panel calls with `{ showId, conflictUid, data }`, returning the updated `SchedulePublishImpactRow` on success. Also exports `RESOLVE_CONFLICT_ERROR_MESSAGES` and a helper `isShowNoLongerEligibleError(error: unknown): boolean` Task 3 needs to show the inline banner.

- [ ] **Step 1: Read the precedent file first**

Read `apps/erify_studios/src/features/studio-shows/api/cancel-studio-show.ts` in full — this task mirrors its `useResolveShowCancellation` shape exactly (mutation hook baking in a generic success/error toast, while the call site — Task 3's panel — adds its own per-call `onError` for the one error code that needs panel-local UI, exactly like `resolve-cancellation-dialog.tsx` does for `ACTIVE_TASKS_REMAIN`).

- [ ] **Step 2: Write the failing test — successful apply patches the cached list row without invalidating**

```typescript
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { schedulePublishImpactKeys } from '../get-schedule-publish-impacts';
import { useResolveScheduleConflict } from '../resolve-schedule-conflict';

import { apiClient } from '@/lib/api/client';

vi.mock('@/lib/api/client', () => ({
  apiClient: { post: vi.fn() },
}));
vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

function createWrapper(queryClient: QueryClient) {
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe('useResolveScheduleConflict', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    vi.mocked(apiClient.post).mockReset();
  });

  it('replaces the resolved row in every cached list page without invalidating', async () => {
    const params = { page: 1, limit: 25 };
    const staleRow = {
      audit_id: 'aud_1', impact_kind: 'stale_conflict', conflict_uid: 'conflict_1',
      conflict_type: 'update_held_back', resolution_status: 'pending', held_back: null,
      schedule_id: null, external_id: 'EXT-1', changed_fields: ['name'], relation_changes: {},
      show: { id: 'show_1', name: 'Test Show', external_id: 'EXT-1', start_time: '2026-01-01T00:00:00.000Z', end_time: '2026-01-01T02:00:00.000Z', status_name: 'Draft', status_system_key: 'DRAFT', client_id: null, client_name: null },
      created_at: '2026-01-01T00:00:00.000Z',
    };
    const resolvedRow = { ...staleRow, resolution_status: 'applied' };

    queryClient.setQueryData(schedulePublishImpactKeys.list('studio_1', params), {
      data: [staleRow],
      meta: { total: 1, totalPages: 1 },
    });
    vi.mocked(apiClient.post).mockResolvedValue({ data: resolvedRow });

    const { result } = renderHook(() => useResolveScheduleConflict('studio_1'), {
      wrapper: createWrapper(queryClient),
    });

    result.current.mutate({ showId: 'show_1', conflictUid: 'conflict_1', data: { action: 'apply', reason: 'confirmed' } });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const cached = queryClient.getQueryData(schedulePublishImpactKeys.list('studio_1', params)) as { data: typeof staleRow[] };
    expect(cached.data[0]!.resolution_status).toBe('applied');
    expect(apiClient.post).toHaveBeenCalledWith(
      '/studios/studio_1/shows/show_1/schedule-publish-impacts/conflict_1/resolve',
      { action: 'apply', reason: 'confirmed' },
    );
  });
});
```

(Check this project's actual test conventions for mocking `apiClient` and wrapping hooks in a `QueryClientProvider` first — an existing test for `useResolveShowCancellation` or a sibling mutation hook almost certainly already establishes this exact pattern; copy it rather than inventing a new one if it differs from what's shown here.)

- [ ] **Step 3: Run test to verify it fails**

Run: `pnpm --filter erify_studios test -- resolve-schedule-conflict.test.ts`
Expected: FAIL — module doesn't exist.

- [ ] **Step 4: Implement**

```typescript
import type { QueryClient } from '@tanstack/react-query';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { toast } from 'sonner';

import type { ResolveScheduleConflictInput, SchedulePublishImpactRow } from '@eridu/api-types/shows';

import { schedulePublishImpactKeys } from './get-schedule-publish-impacts';

import { getMutationErrorMessage } from '@/features/studio-shows/lib/get-mutation-error-message';
import type { PaginatedResponse } from '@/lib/api/admin';
import { apiClient } from '@/lib/api/client';

export const RESOLVE_CONFLICT_ERROR_MESSAGES: Record<string, string> = {
  SHOW_NO_LONGER_ELIGIBLE: 'This show is no longer eligible — it left this state since the conflict was opened. The conflict has been closed automatically.',
  CONFLICT_STATE_CHANGED: 'The show has changed since this conflict was opened. Refresh and review the latest data before resolving.',
  CONFLICT_ALREADY_RESOLVED: 'This conflict was already resolved.',
  ACTOR_NOT_FOUND: 'Could not identify the current user. Try signing in again.',
};

export function getResolveConflictErrorCode(error: unknown): string | null {
  if (!axios.isAxiosError(error)) {
    return null;
  }
  const message = (error.response?.data as { message?: unknown } | undefined)?.message;
  return typeof message === 'string' && message.trim().length > 0 ? message : null;
}

export function isShowNoLongerEligibleError(error: unknown): boolean {
  return getResolveConflictErrorCode(error) === 'SHOW_NO_LONGER_ELIGIBLE';
}

export async function resolveScheduleConflict(
  studioId: string,
  showId: string,
  conflictUid: string,
  data: ResolveScheduleConflictInput,
): Promise<SchedulePublishImpactRow> {
  const response = await apiClient.post<SchedulePublishImpactRow>(
    `/studios/${studioId}/shows/${showId}/schedule-publish-impacts/${conflictUid}/resolve`,
    data,
  );
  return response.data;
}

function replaceRowInCachedLists(queryClient: QueryClient, studioId: string, updatedRow: SchedulePublishImpactRow) {
  queryClient.setQueriesData<PaginatedResponse<SchedulePublishImpactRow>>(
    { queryKey: schedulePublishImpactKeys.listPrefix(studioId) },
    (current) => {
      if (!current) {
        return current;
      }
      return {
        ...current,
        data: current.data.map((row) => (row.conflict_uid === updatedRow.conflict_uid ? updatedRow : row)),
      };
    },
  );
}

export function useResolveScheduleConflict(studioId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ showId, conflictUid, data }: { showId: string; conflictUid: string; data: ResolveScheduleConflictInput }) =>
      resolveScheduleConflict(studioId, showId, conflictUid, data),
    onSuccess: (updatedRow, variables) => {
      replaceRowInCachedLists(queryClient, studioId, updatedRow);
      toast.success(
        variables.data.action === 'apply'
          ? `Applied — ${updatedRow.show.name} has been updated.`
          : `Dismissed — ${updatedRow.show.name} will keep its current data.`,
      );
    },
    onError: (error) => {
      if (isShowNoLongerEligibleError(error)) {
        toast.error(`Conflict closed automatically — this show is no longer eligible.`);
        queryClient.invalidateQueries({ queryKey: schedulePublishImpactKeys.listPrefix(studioId) });
        return;
      }
      toast.error(getMutationErrorMessage(error, 'Failed to resolve conflict', RESOLVE_CONFLICT_ERROR_MESSAGES));
    },
  });
}
```

Note the `SHOW_NO_LONGER_ELIGIBLE` branch deliberately invalidates (full refetch) rather than patching the cache like the success path does — there's no updated row to patch with (the request failed), and per the validated UX decision this is a system-driven auto-close the planner didn't request, so it's fine for it to simply disappear on refetch rather than linger dimmed (lingering-dimmed is specifically for a row the planner themselves just resolved).

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm --filter erify_studios test -- resolve-schedule-conflict.test.ts`
Expected: PASS

- [ ] **Step 6: Lint, typecheck**

Run: `pnpm --filter erify_studios lint && pnpm --filter erify_studios typecheck`
Expected: clean

- [ ] **Step 7: Commit**

```bash
git add apps/erify_studios/src/features/shows/api/resolve-schedule-conflict.ts apps/erify_studios/src/features/shows/api/__tests__/resolve-schedule-conflict.test.ts
git commit -m "feat(erify_studios): add resolve-schedule-conflict mutation hook"
```

---

### Task 3: Held-back diff renderer + review panel

**Files:**
- Create: `apps/erify_studios/src/features/shows/components/held-back-diff.tsx`
- Create: `apps/erify_studios/src/features/shows/components/schedule-conflict-review-panel.tsx`
- Test: `apps/erify_studios/src/features/shows/components/__tests__/held-back-diff.test.tsx`
- Test: `apps/erify_studios/src/features/shows/components/__tests__/schedule-conflict-review-panel.test.tsx`
- Modify: `apps/erify_studios/src/i18n/messages/en.json`

**Interfaces:**
- Consumes: `ResponsiveSheet` (Task 1), `useResolveScheduleConflict`/`isShowNoLongerEligibleError` (Task 2), `HeldBackPayload`/`SchedulePublishImpactRow` (existing, `@eridu/api-types/shows`).
- Produces: `HeldBackDiff` — pure presentational component, `{ heldBack: HeldBackPayload }`. `ScheduleConflictReviewPanel` — `{ studioId: string; row: SchedulePublishImpactRow | null; open: boolean; onOpenChange: (open: boolean) => void }`. Task 5 renders `ScheduleConflictReviewPanel` once per route, passing the currently-selected row.

- [ ] **Step 1: Write the failing test for `HeldBackDiff`**

```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { HeldBackPayload } from '@eridu/api-types/shows';

import { HeldBackDiff } from '../held-back-diff';

describe('heldBackDiff', () => {
  it('renders a plain scalar field change', () => {
    const heldBack: HeldBackPayload = {
      show_fields: { changed_fields: ['name'], old: { name: 'Friday Night Live' }, new: { name: 'Friday Night LIVE (Rebrand)' } },
      show_creators: [],
      show_platforms: [],
      proposed_status_transition: null,
    };
    render(<HeldBackDiff heldBack={heldBack} />);
    expect(screen.getByText('Friday Night Live')).toBeInTheDocument();
    expect(screen.getByText('Friday Night LIVE (Rebrand)')).toBeInTheDocument();
  });

  it('renders an FK-backed field change using the resolved name, never the uid', () => {
    const heldBack: HeldBackPayload = {
      show_fields: {
        changed_fields: ['show_type_id'],
        old: { show_type_id: { uid: 'shwtyp_1', name: 'bau' } },
        new: { show_type_id: { uid: 'shwtyp_2', name: 'campaign' } },
      },
      show_creators: [],
      show_platforms: [],
      proposed_status_transition: null,
    };
    render(<HeldBackDiff heldBack={heldBack} />);
    expect(screen.getByText('bau')).toBeInTheDocument();
    expect(screen.getByText('campaign')).toBeInTheDocument();
    expect(screen.queryByText('shwtyp_1')).not.toBeInTheDocument();
    expect(screen.queryByText('shwtyp_2')).not.toBeInTheDocument();
  });

  it('renders a held-back creator removal', () => {
    const heldBack: HeldBackPayload = {
      show_fields: null,
      show_creators: [{ creator_uid: 'creator_jane', action: 'remove', old_note: 'Backup host', new_note: null }],
      show_platforms: [],
      proposed_status_transition: null,
    };
    render(<HeldBackDiff heldBack={heldBack} />);
    expect(screen.getByText(/creator_jane/)).toBeInTheDocument();
    expect(screen.getByText(/Backup host/)).toBeInTheDocument();
  });

  it('renders a proposed status transition with the live-re-evaluation caveat', () => {
    const heldBack: HeldBackPayload = {
      show_fields: null,
      show_creators: [],
      show_platforms: [],
      proposed_status_transition: { from: 'DRAFT', to: 'CANCELLED_PENDING_RESOLUTION' },
    };
    render(<HeldBackDiff heldBack={heldBack} />);
    expect(screen.getByText('DRAFT')).toBeInTheDocument();
    expect(screen.getByText('CANCELLED_PENDING_RESOLUTION')).toBeInTheDocument();
    expect(screen.getByText(/may resolve differently/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter erify_studios test -- held-back-diff.test.tsx`
Expected: FAIL — module doesn't exist.

- [ ] **Step 3: Implement `HeldBackDiff`**

```tsx
import { format } from 'date-fns';

import type { HeldBackPayload } from '@eridu/api-types/shows';
import { Badge } from '@eridu/ui';

const DATE_FIELDS = new Set(['start_time', 'end_time']);

function formatFieldValue(field: string, value: string | boolean | null | { uid: string; name: string }): string {
  if (value === null) {
    return '—';
  }
  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }
  if (typeof value === 'object') {
    return value.name;
  }
  if (DATE_FIELDS.has(field)) {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? value : format(parsed, 'MMM d, yyyy h:mm a');
  }
  return value;
}

function fieldLabel(field: string): string {
  return field
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function HeldBackDiff({ heldBack }: { heldBack: HeldBackPayload }) {
  return (
    <div className="space-y-4 text-sm">
      {heldBack.show_fields ? (
        <section>
          <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Show fields</h4>
          <div className="space-y-1.5">
            {heldBack.show_fields.changed_fields.map((field) => (
              <div key={field} className="flex flex-wrap items-baseline gap-2">
                <span className="font-medium min-w-24">{fieldLabel(field)}</span>
                <span className="text-muted-foreground line-through decoration-destructive">
                  {formatFieldValue(field, heldBack.show_fields!.old[field] ?? null)}
                </span>
                <span className="text-muted-foreground">→</span>
                <span className="font-medium">
                  {formatFieldValue(field, heldBack.show_fields!.new[field] ?? null)}
                </span>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {heldBack.show_creators.length > 0 ? (
        <section>
          <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Creators</h4>
          <div className="space-y-1.5">
            {heldBack.show_creators.map((creator) => (
              <div key={creator.creator_uid} className="flex flex-wrap items-baseline gap-2">
                <span className="font-medium">{creator.creator_uid}</span>
                {creator.action === 'remove' ? (
                  <>
                    <span className="text-muted-foreground line-through decoration-destructive">{creator.old_note ?? 'no note'}</span>
                    <span className="text-muted-foreground">→</span>
                    <span className="font-medium">removed</span>
                  </>
                ) : (
                  <>
                    <span className="text-muted-foreground line-through decoration-destructive">{creator.old_note ?? 'no note'}</span>
                    <span className="text-muted-foreground">→</span>
                    <span className="font-medium">{creator.new_note ?? 'no note'}</span>
                  </>
                )}
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {heldBack.show_platforms.length > 0 ? (
        <section>
          <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Platforms</h4>
          <div className="space-y-1.5">
            {heldBack.show_platforms.map((platform) => (
              <div key={platform.platform_uid} className="flex flex-wrap items-baseline gap-2">
                <span className="font-medium">{platform.platform_uid}</span>
                <span className="text-muted-foreground line-through decoration-destructive">
                  {platform.old.live_stream_link ?? platform.old.platform_show_id ?? 'unset'}
                </span>
                <span className="text-muted-foreground">→</span>
                <span className="font-medium">
                  {platform.action === 'remove' ? 'removed' : (platform.new.live_stream_link ?? platform.new.platform_show_id ?? 'unset')}
                </span>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {heldBack.proposed_status_transition ? (
        <section>
          <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Proposed status</h4>
          <div className="inline-flex items-center gap-2 rounded-md border px-2.5 py-1.5">
            <Badge variant="outline">{heldBack.proposed_status_transition.from}</Badge>
            <span className="text-muted-foreground">→</span>
            <Badge variant="outline">{heldBack.proposed_status_transition.to}</Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1.5">
            Re-checked live when you apply — may resolve differently if task state has changed.
          </p>
        </section>
      ) : null}
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter erify_studios test -- held-back-diff.test.tsx`
Expected: PASS, 4/4

- [ ] **Step 5: Write the failing test for `ScheduleConflictReviewPanel`**

```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { SchedulePublishImpactRow } from '@eridu/api-types/shows';

import { ScheduleConflictReviewPanel } from '../schedule-conflict-review-panel';

import { apiClient } from '@/lib/api/client';

vi.mock('@/lib/api/client', () => ({
  apiClient: { post: vi.fn() },
}));
vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));
vi.mock('@eridu/ui/hooks/use-is-mobile', () => ({
  useIsMobile: () => false,
}));

const baseRow: SchedulePublishImpactRow = {
  audit_id: 'aud_1', impact_kind: 'stale_conflict', conflict_uid: 'conflict_1',
  conflict_type: 'update_held_back', resolution_status: 'pending',
  held_back: { show_fields: { changed_fields: ['name'], old: { name: 'A' }, new: { name: 'B' } }, show_creators: [], show_platforms: [], proposed_status_transition: null },
  schedule_id: null, external_id: 'EXT-1', changed_fields: ['name'], relation_changes: {},
  show: { id: 'show_1', name: 'Test Show', external_id: 'EXT-1', start_time: '2026-01-01T00:00:00.000Z', end_time: '2026-01-01T02:00:00.000Z', status_name: 'Draft', status_system_key: 'DRAFT', client_id: null, client_name: null },
  created_at: '2026-01-01T00:00:00.000Z',
};

function renderPanel(row: SchedulePublishImpactRow | null, onOpenChange = vi.fn()) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return render(
    <ScheduleConflictReviewPanel studioId="studio_1" row={row} open={row !== null} onOpenChange={onOpenChange} />,
    { wrapper },
  );
}

describe('scheduleConflictReviewPanel', () => {
  beforeEach(() => {
    vi.mocked(apiClient.post).mockReset();
  });

  it('disables Apply until a reason is entered', async () => {
    renderPanel(baseRow);
    const applyButton = screen.getByRole('button', { name: /apply/i });
    expect(applyButton).toBeDisabled();

    await userEvent.type(screen.getByLabelText(/reason/i), 'confirmed with planner');
    expect(applyButton).not.toBeDisabled();
  });

  it('submits apply with the entered reason', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: { ...baseRow, resolution_status: 'applied' } });
    const onOpenChange = vi.fn();
    renderPanel(baseRow, onOpenChange);

    await userEvent.type(screen.getByLabelText(/reason/i), 'confirmed with planner');
    await userEvent.click(screen.getByRole('button', { name: /apply/i }));

    await waitFor(() => expect(apiClient.post).toHaveBeenCalledWith(
      '/studios/studio_1/shows/show_1/schedule-publish-impacts/conflict_1/resolve',
      { action: 'apply', reason: 'confirmed with planner' },
    ));
  });

  it('shows an inline banner and does not close the panel on SHOW_NO_LONGER_ELIGIBLE', async () => {
    vi.mocked(apiClient.post).mockRejectedValue({
      isAxiosError: true,
      response: { data: { message: 'SHOW_NO_LONGER_ELIGIBLE' } },
    });
    const onOpenChange = vi.fn();
    renderPanel(baseRow, onOpenChange);

    await userEvent.type(screen.getByLabelText(/reason/i), 'confirmed with planner');
    await userEvent.click(screen.getByRole('button', { name: /apply/i }));

    await waitFor(() => expect(screen.getByText(/no longer eligible/i)).toBeInTheDocument());
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
  });

  it('renders nothing when row is null', () => {
    renderPanel(null);
    expect(screen.queryByText(/reason/i)).not.toBeInTheDocument();
  });
});
```

(If `axios.isAxiosError` doesn't accept a plain object shape like the mock above in this test environment, check how `resolve-cancellation-dialog.tsx`'s own existing test — if one exists — mocks an axios error, and match that shape instead; the point is a rejected promise whose `response.data.message` is `'SHOW_NO_LONGER_ELIGIBLE'`.)

- [ ] **Step 6: Run test to verify it fails**

Run: `pnpm --filter erify_studios test -- schedule-conflict-review-panel.test.tsx`
Expected: FAIL — module doesn't exist.

- [ ] **Step 7: Implement `ScheduleConflictReviewPanel`**

```tsx
import { useState } from 'react';

import type { SchedulePublishImpactRow } from '@eridu/api-types/shows';
import { Button, Label, Textarea } from '@eridu/ui';

import { HeldBackDiff } from './held-back-diff';

import { ResponsiveSheet } from '@/components/responsive-sheet';
import { isShowNoLongerEligibleError, useResolveScheduleConflict } from '@/features/shows/api/resolve-schedule-conflict';

type ScheduleConflictReviewPanelProps = {
  studioId: string;
  row: SchedulePublishImpactRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function ScheduleConflictReviewPanel({ studioId, row, open, onOpenChange }: ScheduleConflictReviewPanelProps) {
  const [reason, setReason] = useState('');
  const [ineligibleMessage, setIneligibleMessage] = useState<string | null>(null);
  const resolveMutation = useResolveScheduleConflict(studioId);

  if (!row || !row.held_back || !row.conflict_uid) {
    return null;
  }

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setReason('');
      setIneligibleMessage(null);
    }
    onOpenChange(nextOpen);
  };

  const submit = (action: 'apply' | 'dismiss') => {
    setIneligibleMessage(null);
    resolveMutation.mutate(
      { showId: row.show.id, conflictUid: row.conflict_uid!, data: { action, reason: reason.trim() } },
      {
        onSuccess: () => handleOpenChange(false),
        onError: (error) => {
          if (isShowNoLongerEligibleError(error)) {
            setIneligibleMessage('This show is no longer eligible — it was completed through the normal production flow after this conflict was opened. The conflict has been closed automatically.');
          }
        },
      },
    );
  };

  const actionLabel = row.conflict_type === 'removal_held_back' ? 'Apply cancellation' : 'Apply edit';

  return (
    <ResponsiveSheet
      open={open}
      onOpenChange={handleOpenChange}
      title={row.show.name}
      description={`${row.conflict_type === 'removal_held_back' ? 'Cancellation held back' : 'Edit held back'} · opened ${row.created_at}`}
      footer={(
        <div className="w-full space-y-2">
          <Label htmlFor="conflict-reason">Reason</Label>
          <Textarea
            id="conflict-reason"
            aria-label="Reason"
            placeholder="Explain why you're applying or dismissing this…"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">Required — recorded on the show's audit history.</p>
          {ineligibleMessage ? (
            <div className="rounded-md bg-destructive px-3 py-2 text-xs text-destructive-foreground">
              {ineligibleMessage}
            </div>
          ) : null}
          <div className="flex gap-2 justify-end">
            <Button
              type="button"
              variant="outline"
              disabled={reason.trim().length === 0 || resolveMutation.isPending}
              onClick={() => submit('dismiss')}
            >
              Dismiss
            </Button>
            <Button
              type="button"
              disabled={reason.trim().length === 0 || resolveMutation.isPending}
              onClick={() => submit('apply')}
            >
              {resolveMutation.isPending ? 'Saving…' : actionLabel}
            </Button>
          </div>
        </div>
      )}
    >
      <HeldBackDiff heldBack={row.held_back} />
    </ResponsiveSheet>
  );
}
```

- [ ] **Step 8: Run tests to verify they pass**

Run: `pnpm --filter erify_studios test -- schedule-conflict-review-panel.test.tsx`
Expected: PASS, 4/4

- [ ] **Step 9: Move user-facing strings to Paraglide i18n keys**

The code above uses inline English strings as a drafting shortcut; `HeldBackDiff` and `ScheduleConflictReviewPanel` render inside `schedule-publish-impacts.tsx`, which is 100% Paraglide-driven — match that convention, don't introduce inline English into this route's surface. Move every user-facing string in `HeldBackDiff` and `ScheduleConflictReviewPanel` into `apps/erify_studios/src/i18n/messages/en.json` under new `schedule_conflict_*` keys (e.g. `schedule_conflict_section_show_fields`, `schedule_conflict_section_creators`, `schedule_conflict_action_apply_edit`, `schedule_conflict_action_apply_cancellation`, `schedule_conflict_reason_label`, `schedule_conflict_reason_hint`, `schedule_conflict_ineligible_banner`, etc.) and reference them via `import * as m from '@/paraglide/messages'` / `m.schedule_conflict_section_show_fields()`, following the exact pattern already used throughout `schedule-publish-impacts.tsx`. Re-run `pnpm --filter erify_studios test -- held-back-diff.test.tsx schedule-conflict-review-panel.test.tsx` after this pass — the tests above query by literal English text, so if you move strings to Paraglide keys the test assertions need to import the same `m.*()` functions and assert against their compiled output, not a hardcoded string (Paraglide compiles `en.json` deterministically, so `screen.getByText(m.schedule_conflict_reason_label())` is more robust than hardcoding the English copy twice).

- [ ] **Step 10: Lint, typecheck**

Run: `pnpm --filter erify_studios lint && pnpm --filter erify_studios typecheck`
Expected: clean

- [ ] **Step 11: Commit**

```bash
git add apps/erify_studios/src/features/shows/components/held-back-diff.tsx apps/erify_studios/src/features/shows/components/schedule-conflict-review-panel.tsx apps/erify_studios/src/features/shows/components/__tests__/held-back-diff.test.tsx apps/erify_studios/src/features/shows/components/__tests__/schedule-conflict-review-panel.test.tsx apps/erify_studios/src/i18n/messages/en.json
git commit -m "feat(erify_studios): add held-back diff renderer and conflict review panel"
```

---

### Task 4: Add a `getRowClassName` prop to the shared `DataTable`

**Files:**
- Modify: `packages/ui/src/components/data-table/data-table-core.tsx`
- Test: create `packages/ui/src/components/data-table/__tests__/data-table-core.test.tsx`

**Interfaces:**
- Produces: `DataTableProps<TData>.getRowClassName?: (row: TData) => string | undefined` — Task 5 uses it to dim resolved `stale_conflict` rows. Optional; omitting it changes nothing for any existing consumer (`erify_studios`, `erify_creators`).

This is the only shared-package change in this plan. The spec requires a resolved conflict row to stay visible but visually dimmed until the next refetch; `DataTable`'s row currently has no way to receive per-row styling (only a static `cursor-pointer` class gated on whether `onRowClick` is set at all — see `data-table-core.tsx:151-155`). Add one small optional prop rather than working around the gap in the consuming route.

- [ ] **Step 1: Write the failing test**

```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { DataTable } from '../data-table-core';

type Row = { id: string; label: string };

const columns = [
  { id: 'label', header: 'Label', cell: ({ row }: { row: { original: Row } }) => row.original.label },
];

const rows: Row[] = [
  { id: 'a', label: 'Row A' },
  { id: 'b', label: 'Row B' },
];

describe('dataTable getRowClassName', () => {
  it('applies the returned className to each row when provided', () => {
    render(
      <DataTable
        data={rows}
        columns={columns as any}
        getRowClassName={(row) => (row.id === 'b' ? 'opacity-50' : undefined)}
      />,
    );
    const rowA = screen.getByText('Row A').closest('tr');
    const rowB = screen.getByText('Row B').closest('tr');
    expect(rowA).not.toHaveClass('opacity-50');
    expect(rowB).toHaveClass('opacity-50');
  });

  it('renders rows with no extra classes when getRowClassName is omitted', () => {
    render(<DataTable data={rows} columns={columns as any} />);
    const rowA = screen.getByText('Row A').closest('tr');
    expect(rowA).not.toHaveClass('opacity-50');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @eridu/ui test -- data-table-core.test.tsx`
Expected: FAIL — `getRowClassName` prop doesn't exist yet (TypeScript error under `as any` cast won't hide the runtime behavior gap; the row will render without the class either way).

- [ ] **Step 3: Implement**

In `data-table-core.tsx`, add to `DataTableProps<TData>` (near the existing `onRowClick` line, ~line 48):

```typescript
  onRowClick?: (row: TData) => void;
  getRowClassName?: (row: TData) => string | undefined;
```

Destructure it in the component signature (near `onRowClick`, ~line 69):

```typescript
  onRowClick,
  getRowClassName,
```

Apply it in the row's `className` (~line 151-155), keeping the existing `onRowClick`-conditional class:

```tsx
                              <TableRow
                                key={row.id}
                                className={cn(getRowClassName?.(row.original), onRowClick && 'cursor-pointer hover:bg-muted/50')}
                                onClick={() => onRowClick?.(row.original)}
                              >
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @eridu/ui test -- data-table-core.test.tsx`
Expected: PASS, 2/2

- [ ] **Step 5: Lint, typecheck, test, build for `@eridu/ui`, and confirm the other consumer still builds**

Run:
```bash
pnpm --filter @eridu/ui lint
pnpm --filter @eridu/ui typecheck
pnpm --filter @eridu/ui test
pnpm --filter @eridu/ui build
pnpm --filter erify_creators build
```
Expected: all green. The `erify_creators` build check confirms the new optional prop didn't change `DataTable`'s existing call sites there (it shouldn't — the prop is additive and every existing call omits it).

- [ ] **Step 6: Commit**

```bash
git add packages/ui/src/components/data-table/data-table-core.tsx packages/ui/src/components/data-table/__tests__/data-table-core.test.tsx
git commit -m "feat(ui): add optional getRowClassName prop to DataTable"
```

---

### Task 5: Wire into the Schedule Publish Impacts route

**Files:**
- Modify: `apps/erify_studios/src/routes/studios/$studioId/schedule-publish-impacts.tsx`
- Modify: `apps/erify_studios/src/i18n/messages/en.json`
- Test: create `apps/erify_studios/src/routes/studios/$studioId/__tests__/schedule-publish-impacts.test.tsx`

**Interfaces:**
- Consumes: `ScheduleConflictReviewPanel` (Task 3), `DataTable`'s `getRowClassName` prop (Task 4).

- [ ] **Step 1: Write the failing test — a stale_conflict row shows a Review action, others don't**

No test file currently covers this route. Read `src/__tests__/integration/studios/client-mechanics.test.tsx` first — it establishes this project's real pattern for testing a studio route whose page component is an unexported function accessed via `(Route as any).component` and rendered through the same `lazyRouteComponent`/`Suspense` path the real router uses. Mirror that pattern exactly. Create `apps/erify_studios/src/routes/studios/$studioId/__tests__/schedule-publish-impacts.test.tsx`:

```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Suspense } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { SchedulePublishImpactRow } from '@eridu/api-types/shows';

import { Route } from '@/routes/studios/$studioId/schedule-publish-impacts';

const SchedulePublishImpactsPage = (Route as any).component;

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('@/lib/hooks/use-studio-access', () => ({
  useStudioAccess: () => ({ isLoading: false, hasAccess: () => true }),
}));

vi.mock('@eridu/ui/hooks/use-is-mobile', () => ({
  useIsMobile: () => false,
}));

const mockParams = { studioId: 'studio_123' };
const mockSearch = { page: 1 };
const mockNavigate = vi.fn();

vi.mock('@tanstack/react-router', async () => {
  const React = await import('react');
  return {
    createFileRoute: () => (options: any) => ({
      ...options,
      useParams: () => mockParams,
      useSearch: () => mockSearch,
      useNavigate: () => mockNavigate,
    }),
    Link: ({ children, ...props }: any) => <a {...props}>{children}</a>,
    lazyRouteComponent: (importer: () => Promise<any>, exportName = 'default') =>
      React.lazy(async () => ({ default: (await importer())[exportName] })),
    Outlet: () => null,
  };
});

let mockRows: SchedulePublishImpactRow[] = [];
vi.mock('@/features/shows/api/get-schedule-publish-impacts', async () => {
  const actual = await vi.importActual('@/features/shows/api/get-schedule-publish-impacts');
  return {
    ...actual,
    useSchedulePublishImpactsQuery: () => ({
      data: { data: mockRows, meta: { total: mockRows.length, totalPages: 1 } },
      isLoading: false,
      isFetching: false,
      refetch: vi.fn(),
    }),
  };
});

vi.mock('@/lib/api/client', () => ({
  apiClient: { post: vi.fn() },
}));

const baseShow = {
  id: 'show_1', name: 'Test Show', external_id: 'EXT-1',
  start_time: '2026-01-01T00:00:00.000Z', end_time: '2026-01-01T02:00:00.000Z',
  status_name: 'Draft', status_system_key: 'DRAFT', client_id: null, client_name: null,
};

const confirmedRow: SchedulePublishImpactRow = {
  audit_id: 'aud_1', impact_kind: 'confirmed_future_updated', conflict_uid: null,
  conflict_type: null, resolution_status: null, held_back: null, schedule_id: null,
  external_id: 'EXT-1', changed_fields: ['name'], relation_changes: {},
  show: baseShow, created_at: '2026-01-01T00:00:00.000Z',
};

const pendingRow: SchedulePublishImpactRow = {
  ...confirmedRow, audit_id: 'aud_2', impact_kind: 'confirmed_future_pending_resolution',
};

const staleConflictRow: SchedulePublishImpactRow = {
  audit_id: 'aud_3', impact_kind: 'stale_conflict', conflict_uid: 'conflict_1',
  conflict_type: 'update_held_back', resolution_status: 'pending',
  held_back: { show_fields: { changed_fields: ['name'], old: { name: 'A' }, new: { name: 'B' } }, show_creators: [], show_platforms: [], proposed_status_transition: null },
  schedule_id: null, external_id: 'EXT-1', changed_fields: ['name'], relation_changes: {},
  show: baseShow, created_at: '2026-01-01T00:00:00.000Z',
};

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <Suspense fallback="loading">
        <SchedulePublishImpactsPage />
      </Suspense>
    </QueryClientProvider>,
  );
}

describe('schedulePublishImpactsPage', () => {
  beforeEach(() => {
    mockRows = [];
  });

  it('shows a Review action only on stale_conflict rows, not on confirmed_future_* rows', async () => {
    mockRows = [confirmedRow, pendingRow, staleConflictRow];
    renderPage();

    await waitFor(() => expect(screen.getAllByRole('row')).toHaveLength(4));

    const reviewButtons = screen.getAllByRole('button', { name: /review/i });
    expect(reviewButtons).toHaveLength(1);

    const staleRow = screen.getByRole('row', { name: /aud_3|Needs review/i });
    expect(within(staleRow).getByText(/needs review/i)).toBeInTheDocument();
  });

  it('opens the review panel when Review is clicked, and shows a muted status instead of Review once resolved', async () => {
    mockRows = [staleConflictRow];
    const { apiClient } = await import('@/lib/api/client');
    vi.mocked(apiClient.post).mockResolvedValue({
      data: { ...staleConflictRow, resolution_status: 'applied' },
    });

    renderPage();
    await userEvent.click(await screen.findByRole('button', { name: /review/i }));

    expect(await screen.findByText('Test Show')).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText(/reason/i), 'confirmed with planner');
    await userEvent.click(screen.getByRole('button', { name: /apply/i }));

    await waitFor(() => expect(apiClient.post).toHaveBeenCalledWith(
      '/studios/studio_123/shows/show_1/schedule-publish-impacts/conflict_1/resolve',
      { action: 'apply', reason: 'confirmed with planner' },
    ));
    await waitFor(() => expect(screen.queryByRole('button', { name: /review/i })).not.toBeInTheDocument());
    expect(screen.getByText(/applied/i)).toBeInTheDocument();
  });
});
```

Adjust the `screen.getByRole('row', { name: ... })` accessible-name query and the `within(staleRow)` assertions once you've run this against the real rendered markup — `DataTable`'s row accessible name is derived from its cell content, so confirm the exact matcher against real output rather than assuming this regex is correct on the first run; the required assertions (exactly one Review button; the stale_conflict row's badge reads "Needs review"; clicking Review opens the panel with the row's real held-back data; a successful resolve removes the Review button and shows a muted resolved status) are fixed, the query syntax to reach them is not.

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter erify_studios test -- schedule-publish-impacts.test.tsx`
Expected: FAIL — no Review action exists yet.

- [ ] **Step 3: Add a needs-review count to the section heading**

In `schedule-publish-impacts.tsx`, add alongside the existing `pendingResolutionCount`/`updatedCount` (existing, ~line 53-54):

```typescript
  const needsReviewCount = rows.filter((row) => row.impact_kind === 'stale_conflict' && row.resolution_status === 'pending').length;
```

Add a small count indicator near the table (existing file has no "section heading" separate from the `DataTable` itself — the simplest fit is a line of text directly above the `DataTable`, matching the validated design decision "no dedicated 4th stat card — the count lives in a heading, not a new card"):

```tsx
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">{m.schedule_publish_impacts_column_show() /* replace with a real "All impacts" heading key */}</h3>
            {needsReviewCount > 0 ? (
              <span className="text-xs text-muted-foreground">{needsReviewCount} need review</span>
            ) : null}
          </div>
```

(Add a proper new Paraglide key for the heading text and the count string — e.g. `schedule_publish_impacts_all_impacts_heading` and a pluralized `schedule_publish_impacts_needs_review_count` — don't reuse `schedule_publish_impacts_column_show` as shown in the placeholder sketch above, that was only to mark where the heading goes.)

- [ ] **Step 4: Add the `stale_conflict` badge and Review action to `createColumns`**

Replace the `impact` column's cell (existing, lines 187-197) to branch on `stale_conflict`:

```tsx
    {
      id: 'impact',
      header: m.schedule_publish_impacts_column_impact(),
      cell: ({ row }) => {
        const impact = row.original;
        if (impact.impact_kind === 'stale_conflict') {
          const isResolved = impact.resolution_status !== 'pending';
          return (
            <Badge variant={isResolved ? 'secondary' : 'outline'} className={isResolved ? undefined : 'border-amber-500 text-amber-700 dark:border-amber-400 dark:text-amber-300'}>
              {isResolved
                ? (impact.resolution_status === 'applied' ? 'Applied' : impact.resolution_status === 'dismissed' ? 'Dismissed' : 'Resolved')
                : 'Needs review'}
            </Badge>
          );
        }
        return (
          <Badge variant={impact.impact_kind === 'confirmed_future_pending_resolution' ? 'destructive' : 'secondary'}>
            {impact.impact_kind === 'confirmed_future_pending_resolution'
              ? m.schedule_publish_impacts_badge_pending()
              : m.schedule_publish_impacts_badge_updated()}
          </Badge>
        );
      },
    },
```

Add a new final column for the Review action (append to the `columns` array, after `created_at`):

```tsx
    {
      id: 'review_action',
      header: '',
      cell: ({ row }) => {
        const impact = row.original;
        if (impact.impact_kind !== 'stale_conflict') {
          return null;
        }
        if (impact.resolution_status !== 'pending') {
          return <span className="text-xs text-muted-foreground">Resolved</span>;
        }
        return (
          <Button type="button" variant="outline" size="sm" onClick={() => onReview(impact)}>
            Review →
          </Button>
        );
      },
    },
```

This requires `createColumns` to accept an `onReview: (row: SchedulePublishImpactRow) => void` callback — update its signature: `function createColumns(studioId: string, onReview: (row: SchedulePublishImpactRow) => void): ColumnDef<SchedulePublishImpactRow>[]`, and update the `useMemo(() => createColumns(studioId), [studioId])` call site to `useMemo(() => createColumns(studioId, handleReview), [studioId, handleReview])` — `handleReview` is defined in the next step.

Wire the dimmed-row treatment through Task 4's new `getRowClassName` prop on the `<DataTable>` element (existing JSX, in the component's `return`, ~line 120):

```tsx
          <DataTable
            data={rows}
            columns={columns}
            isLoading={isLoading}
            isFetching={isFetching}
            emptyMessage={m.schedule_publish_impacts_empty()}
            manualPagination
            pageCount={pageCount}
            paginationState={paginationState}
            onPaginationChange={handlePaginationChange}
            getRowClassName={(row) => (
              row.impact_kind === 'stale_conflict' && row.resolution_status !== 'pending'
                ? 'opacity-50'
                : undefined
            )}
            renderFooter={() => (
```

(Keep the rest of the existing `<DataTable>` props — `renderFooter` and its contents — unchanged; only the new `getRowClassName` prop is added.)

- [ ] **Step 5: Wire panel open/close state and render `ScheduleConflictReviewPanel`**

Inside `SchedulePublishImpactsPage`, add:

```typescript
  const [selectedRow, setSelectedRow] = useState<SchedulePublishImpactRow | null>(null);
  const handleReview = useCallback((row: SchedulePublishImpactRow) => {
    setSelectedRow(row);
  }, []);
```

Add `useState` to the existing `react` import (currently `import { useCallback, useMemo } from 'react';` — add `useState`).

Render the panel once, right after the closing `</StudioRouteGuard>`'s content (i.e., as a sibling to the guarded content, or inside it — either is fine since the panel is self-hiding when `row` is null; keep it inside `<StudioRouteGuard>` for simplicity, right after the closing `</PageLayout>` tag but before `</StudioRouteGuard>`):

```tsx
        <ScheduleConflictReviewPanel
          studioId={studioId}
          row={selectedRow}
          open={selectedRow !== null}
          onOpenChange={(open) => {
            if (!open) {
              setSelectedRow(null);
            }
          }}
        />
```

Add the import: `import { ScheduleConflictReviewPanel } from '@/features/shows/components/schedule-conflict-review-panel';`.

- [ ] **Step 6: Run tests to verify they pass**

Run: `pnpm --filter erify_studios test -- schedule-publish-impacts.test.tsx`
Expected: PASS

- [ ] **Step 7: Add the new i18n keys**

Add every new key referenced in Steps 3-4 to `apps/erify_studios/src/i18n/messages/en.json`, following the existing flat-key style shown in that file's `schedule_publish_impacts_*` block — e.g.:

```json
  "schedule_publish_impacts_all_impacts_heading": "All impacts",
  "schedule_publish_impacts_needs_review_count": "{count} need review",
  "schedule_publish_impacts_badge_needs_review": "Needs review",
  "schedule_publish_impacts_badge_applied": "Applied",
  "schedule_publish_impacts_badge_dismissed": "Dismissed",
  "schedule_publish_impacts_badge_resolved": "Resolved",
  "schedule_publish_impacts_review_action": "Review",
  "schedule_publish_impacts_resolved_label": "Resolved"
```

(Use Paraglide's ICU-style `{count}` interpolation for the pluralized count string if this project's other Paraglide messages already use that pattern — check an existing interpolated key in `en.json` for the exact syntax before assuming `{count}` is correct; it may need to be `{count, plural, ...}` or a different placeholder convention.) Replace every inline string introduced in Steps 3-4 with the corresponding `m.*()` call, matching the rest of this file's style exactly (100% Paraglide, no inline English in this route).

Run `pnpm --filter erify_studios typecheck` after adding keys — Paraglide's compiled `messages` module is generated from `en.json`, so a missing/misspelled key surfaces as a real type error, not a silent runtime fallback.

- [ ] **Step 8: Full lint, typecheck, test, build for erify_studios**

Run:
```bash
pnpm --filter erify_studios lint
pnpm --filter erify_studios typecheck
pnpm --filter erify_studios test
pnpm --filter erify_studios build
```
Expected: all green.

- [ ] **Step 9: Commit**

```bash
git add apps/erify_studios/src/routes/studios/\$studioId/schedule-publish-impacts.tsx apps/erify_studios/src/i18n/messages/en.json
git add apps/erify_studios/src/routes/studios/\$studioId/__tests__/schedule-publish-impacts.test.tsx
git commit -m "feat(erify_studios): surface stale_conflict rows with Review action on Schedule Publish Impacts"
```

---

### Task 6: Manual verification + full sweep

**Files:** none (verification only)

- [ ] **Step 1: Start the dev server and exercise the real flow**

Per this repo's `verify` skill / AGENTS.md UI-testing guidance, this feature must be exercised in a real browser before being considered done, not just typechecked and unit-tested. Start `erify_studios`'s dev server (check `apps/erify_studios/package.json` for the exact command, likely `pnpm dev` from that directory or `pnpm dev:studios` from the repo root), sign in as a studio Manager/Admin, and navigate to `/studios/:studioId/schedule-publish-impacts`.

Since this needs real `stale_conflict` data to exercise fully and none exists yet in any seeded dev database, either: (a) seed one manually via the backend (a `POST .../publish` against a schedule containing a past show with `actualStartTime` populated and a conflicting sheet edit — see the backend's own test fixtures for the exact shape), or (b) temporarily stub `useSchedulePublishImpactsQuery`'s return value in a local dev-only branch to visually confirm the table renders the new badge/column and the panel opens/closes correctly on both desktop width and a narrow (mobile) browser width — revert the stub before finishing, it must not ship.

Confirm: the `stale_conflict` badge and Review button render correctly; the panel opens as a right-docked sheet at desktop width and slides up as a bottom drawer below the `md` breakpoint (resize the browser to confirm both); the reason field gates the Apply/Dismiss buttons; a successful resolve shows a toast, dims the row, and updates its badge without the row disappearing immediately.

- [ ] **Step 2: Full verification checklist**

Run:
```bash
pnpm --filter erify_studios lint
pnpm --filter erify_studios typecheck
pnpm --filter erify_studios test
pnpm --filter erify_studios build
pnpm --filter @eridu/ui lint
pnpm --filter @eridu/ui typecheck
pnpm --filter @eridu/ui test
pnpm --filter @eridu/ui build
pnpm --filter erify_creators build
```
Expected: all green.

- [ ] **Step 3: Cross-check the design spec's Frontend Testing Plan bullet**

Re-read the spec's Testing Plan section: "Frontend: ... Cover the `Review` action appearing only on pending `stale_conflict` rows, the Apply/Dismiss panel's required-reason gating, the desktop sheet / mobile drawer swap, and `SHOW_NO_LONGER_ELIGIBLE`/`CONFLICT_STATE_CHANGED` error surfacing in component tests." Confirm each clause has a corresponding test from Tasks 1-5: Review-only-on-pending-stale_conflict and dimmed-resolved-row (Task 5, backed by Task 4's `getRowClassName`), reason-gating (Task 3), desktop/mobile swap (Task 1), `SHOW_NO_LONGER_ELIGIBLE` surfacing (Task 3) — `CONFLICT_STATE_CHANGED` surfacing has **no test yet** in this plan; add one to `schedule-conflict-review-panel.test.tsx` (a generic-error toast path, distinct from the `SHOW_NO_LONGER_ELIGIBLE` inline-banner path) before proceeding — do not defer silently.

- [ ] **Step 4: Run `/pr-ready`** (or the `pr-review.md` workflow manually) before opening the PR, per `AGENTS.md`'s merge-readiness gate. This PR's base is the backend branch, not `master` — scope the diff accordingly (`git diff --name-only <backend-branch>...HEAD`, not `origin/master...HEAD`).

- [ ] **Step 5: Commit any final fixups, then hand off per `superpowers:finishing-a-development-branch`.**
