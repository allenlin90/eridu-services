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

// The shared test setup (src/test/setup.ts) globally stubs useQueryClient()
// to return `{}`, which breaks useResolveScheduleConflict's real cache-update
// call (queryClient.setQueriesData). This test needs the real QueryClient
// wired through QueryClientProvider, so restore the actual implementation
// for this file only.
vi.mock('@tanstack/react-query', async () => {
  const actual = await vi.importActual<typeof import('@tanstack/react-query')>('@tanstack/react-query');
  return { ...actual };
});

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
  id: 'show_1',
  name: 'Test Show',
  external_id: 'EXT-1',
  start_time: '2026-01-01T00:00:00.000Z',
  end_time: '2026-01-01T02:00:00.000Z',
  status_name: 'Draft',
  status_system_key: 'DRAFT',
  client_id: null,
  client_name: null,
};

const confirmedRow: SchedulePublishImpactRow = {
  audit_id: 'aud_1',
  impact_kind: 'confirmed_future_updated',
  conflict_uid: null,
  conflict_type: null,
  resolution_status: null,
  held_back: null,
  schedule_id: null,
  external_id: 'EXT-1',
  changed_fields: ['name'],
  relation_changes: {},
  show: baseShow,
  created_at: '2026-01-01T00:00:00.000Z',
};

const pendingRow: SchedulePublishImpactRow = {
  ...confirmedRow,
  audit_id: 'aud_2',
  impact_kind: 'confirmed_future_pending_resolution',
};

const staleConflictRow: SchedulePublishImpactRow = {
  audit_id: 'aud_3',
  impact_kind: 'stale_conflict',
  conflict_uid: 'conflict_1',
  conflict_type: 'update_held_back',
  resolution_status: 'pending',
  held_back: { show_fields: { changed_fields: ['name'], old: { name: 'A' }, new: { name: 'B' } }, show_creators: [], show_platforms: [], proposed_status_transition: null },
  schedule_id: null,
  external_id: 'EXT-1',
  changed_fields: ['name'],
  relation_changes: {},
  show: baseShow,
  created_at: '2026-01-01T00:00:00.000Z',
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

    await waitFor(() => expect(screen.getAllByRole('row')).toHaveLength(4), { timeout: 5000 });

    const reviewButtons = screen.getAllByRole('button', { name: /review/i });
    expect(reviewButtons).toHaveLength(1);

    const staleRow = reviewButtons[0].closest('tr');
    expect(staleRow).not.toBeNull();
    expect(within(staleRow as HTMLElement).getByText(/needs review/i)).toBeInTheDocument();
  });

  it('opens the review panel when Review is clicked, and shows a muted status instead of Review once resolved', async () => {
    mockRows = [staleConflictRow];
    const { apiClient } = await import('@/lib/api/client');
    vi.mocked(apiClient.post).mockImplementation(async () => {
      const resolvedRow: SchedulePublishImpactRow = { ...staleConflictRow, resolution_status: 'applied' };
      // Mirror what the real mutation's onSuccess cache update would do: the
      // next render of the (mocked) list query must reflect the resolved row.
      mockRows = [resolvedRow];
      return { data: resolvedRow };
    });

    renderPage();
    await userEvent.click(await screen.findByRole('button', { name: /review/i }, { timeout: 5000 }));

    expect(await screen.findByRole('heading', { name: 'Test Show' }, { timeout: 5000 })).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText(/reason/i), 'confirmed with planner');
    await userEvent.click(screen.getByRole('button', { name: /apply/i }));

    await waitFor(() => expect(apiClient.post).toHaveBeenCalledWith(
      '/studios/studio_123/shows/show_1/schedule-publish-impacts/conflict_1/resolve',
      { action: 'apply', reason: 'confirmed with planner' },
    ));
    await waitFor(() => expect(screen.queryByRole('button', { name: /review/i })).not.toBeInTheDocument());
    const appliedText = screen.getByText(/applied/i);
    expect(appliedText).toBeInTheDocument();
    expect(appliedText.closest('tr')).toHaveClass('opacity-50');
  });
});
