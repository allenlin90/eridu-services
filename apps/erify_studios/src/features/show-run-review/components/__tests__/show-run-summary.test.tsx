import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import type { ShowRunReviewSummary } from '@eridu/api-types/shows';

import { ShowRunSummary } from '../show-run-summary';

// `data` is `undefined` on a failed query, same as a genuinely empty result
// with no successful response yet — the error-state test below relies on
// that being a valid shape for this mock, not just the populated one.
type IssuesQueryMockResult = {
  data: { data: Array<{ id: string; title: string }>; meta: { page: number; limit: number; total: number; totalPages: number } } | undefined;
  isFetching: boolean;
  isLoading: boolean;
  isError?: boolean;
  error?: unknown;
  refetch?: () => void;
};

const mocks = vi.hoisted(() => ({
  getShowRunReviewCreators: vi.fn(),
  getShowRunReviewShows: vi.fn(),
  getShowRunReviewTasks: vi.fn(),
  getShowRunReviewViolations: vi.fn(),
  getShowRunReviewIssues: vi.fn(),
  exportShowRunReviewCreators: vi.fn(),
  exportShowRunReviewShows: vi.fn(),
  exportShowRunReviewTasks: vi.fn(),
  exportShowRunReviewViolations: vi.fn(),
  exportShowRunReviewIssues: vi.fn(),
  // Explicit generic (not inferred) so `data: undefined` — the shape a
  // failed query resolves to — type-checks on later `mockReturnValueOnce`
  // calls, not just the populated shape this default returns.
  useShowRunReviewIssuesQuery: vi.fn<() => IssuesQueryMockResult>(() => ({
    data: {
      data: [],
      meta: { page: 1, limit: 10, total: 0, totalPages: 0 },
    },
    isFetching: false,
    isLoading: false,
  })),
}));

vi.mock('@eridu/ui', () => ({
  Badge: ({ children }: { children: ReactNode }) => <span>{children}</span>,
  Button: ({
    children,
    disabled,
    onClick,
    type,
  }: {
    children: ReactNode;
    disabled?: boolean;
    onClick?: () => void;
    type?: 'button' | 'submit' | 'reset';
  }) => (
    <button type={type ?? 'button'} disabled={disabled} onClick={onClick}>
      {children}
    </button>
  ),
  Card: ({ children }: { children: ReactNode }) => <section>{children}</section>,
  CardContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  CardDescription: ({ children }: { children: ReactNode }) => <p>{children}</p>,
  CardHeader: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  CardTitle: ({ children }: { children: ReactNode }) => <h2>{children}</h2>,
  DataTable: () => <div data-testid="data-table" />,
  DataTablePagination: () => <div data-testid="data-table-pagination" />,
  Input: () => <input />,
  Select: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SelectContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SelectTrigger: ({ children }: { children: ReactNode }) => <button type="button">{children}</button>,
  SelectValue: () => <span />,
}));

vi.mock('@/features/shows/api/get-show-run-review-paginated', () => ({
  getShowRunReviewCreators: mocks.getShowRunReviewCreators,
  getShowRunReviewShows: mocks.getShowRunReviewShows,
  getShowRunReviewTasks: mocks.getShowRunReviewTasks,
  getShowRunReviewViolations: mocks.getShowRunReviewViolations,
  getShowRunReviewIssues: mocks.getShowRunReviewIssues,
  useShowRunReviewIssuesQuery: mocks.useShowRunReviewIssuesQuery,
  useShowRunReviewCreatorsQuery: () => ({
    data: {
      data: [],
      meta: { page: 1, limit: 10, total: 1, totalPages: 1 },
    },
    isFetching: false,
    isLoading: false,
  }),
  useShowRunReviewShowsQuery: () => ({
    data: {
      data: [],
      meta: { page: 1, limit: 10, total: 0, totalPages: 0 },
    },
    isFetching: false,
    isLoading: false,
  }),
  useShowRunReviewTasksQuery: () => ({
    data: {
      data: [],
      meta: { page: 1, limit: 10, total: 0, totalPages: 0 },
    },
    isFetching: false,
    isLoading: false,
  }),
  useShowRunReviewViolationsQuery: () => ({
    data: {
      data: [],
      meta: { page: 1, limit: 10, total: 0, totalPages: 0 },
    },
    isFetching: false,
    isLoading: false,
  }),
}));

vi.mock('@/features/show-run-review/lib/show-run-review-csv', () => ({
  exportShowRunReviewCreators: mocks.exportShowRunReviewCreators,
  exportShowRunReviewShows: mocks.exportShowRunReviewShows,
  exportShowRunReviewTasks: mocks.exportShowRunReviewTasks,
  exportShowRunReviewViolations: mocks.exportShowRunReviewViolations,
  exportShowRunReviewIssues: mocks.exportShowRunReviewIssues,
}));

const summary: ShowRunReviewSummary = {
  date_from: '2026-05-30T21:00:00.000Z',
  date_to: '2026-05-31T20:59:59.999Z',
  shows: {
    total_count: 1,
    started_count: 1,
    not_started_count: 0,
    late_start_count: 0,
    missing_duration_minutes: 0,
    end_recorded_count: 1,
  },
  creators: {
    total_count: 1,
    late_count: 1,
    missing_count: 0,
    exceptions: [],
  },
  platforms: {
    active_violations_count: 0,
    violations: [],
  },
  tasks: {
    incomplete_phase_checks_count: 0,
    incomplete_tasks: [],
  },
  issues: {
    unresolved_count: 2,
    unresolved_by_severity: { low: 0, medium: 0, high: 1, critical: 1 },
  },
};

describe('showRunSummary', () => {
  it('exports creators with the resolved summary date range when URL date search is unset', async () => {
    const user = userEvent.setup();
    mocks.getShowRunReviewCreators.mockResolvedValue({
      data: [],
      meta: { page: 1, limit: 1, total: 1, totalPages: 1 },
    });

    render(
      <ShowRunSummary
        data={summary}
        search={{ tab: 'creators' }}
        onSearchChange={vi.fn()}
        studioId="std_123"
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Export CSV' }));

    await waitFor(() => {
      expect(mocks.getShowRunReviewCreators).toHaveBeenCalledWith('std_123', {
        date_from: summary.date_from,
        date_to: summary.date_to,
        page: 1,
        limit: 1,
        search: undefined,
        status: undefined,
      });
    });
    expect(mocks.exportShowRunReviewCreators).toHaveBeenCalledWith([], {
      dateFrom: summary.date_from,
      dateTo: summary.date_to,
    });
  });

  it('shows the unresolved issue count on the Issues tab nav badge', () => {
    render(
      <ShowRunSummary
        data={summary}
        search={{ tab: 'creators' }}
        onSearchChange={vi.fn()}
        studioId="std_123"
      />,
    );

    // Tab nav renders a count badge next to the "Issues" label — matches
    // data.issues.unresolved_count (2 in the shared fixture).
    const issuesTabButton = screen.getByRole('button', { name: /Issues/ });
    expect(issuesTabButton).toHaveTextContent('2');
  });

  it('switches to the issues tab and resets every tab\'s filters, including its own', async () => {
    const user = userEvent.setup();
    const onSearchChange = vi.fn();

    render(
      <ShowRunSummary
        data={summary}
        search={{ tab: 'creators' }}
        onSearchChange={onSearchChange}
        studioId="std_123"
      />,
    );

    await user.click(screen.getByRole('button', { name: /Issues/ }));

    expect(onSearchChange).toHaveBeenCalledWith(
      expect.objectContaining({
        tab: 'issues',
        issues_search: undefined,
        issues_severity: undefined,
        issues_page: undefined,
      }),
    );
  });

  it('requests issues with the resolved date range, severity filter, and page when the issues tab is active', () => {
    render(
      <ShowRunSummary
        data={summary}
        search={{ tab: 'issues', issues_severity: 'HIGH', issues_page: 2 }}
        onSearchChange={vi.fn()}
        studioId="std_123"
      />,
    );

    expect(mocks.useShowRunReviewIssuesQuery).toHaveBeenCalledWith(
      'std_123',
      {
        date_from: summary.date_from,
        date_to: summary.date_to,
        page: 2,
        limit: 10,
        search: undefined,
        severity: 'HIGH',
      },
      true,
    );
  });

  it('renders the empty-issues message and disables export when the issues query returns no rows', () => {
    mocks.useShowRunReviewIssuesQuery.mockReturnValueOnce({
      data: { data: [], meta: { page: 1, limit: 10, total: 0, totalPages: 0 } },
      isFetching: false,
      isLoading: false,
    });

    render(
      <ShowRunSummary
        data={summary}
        search={{ tab: 'issues' }}
        onSearchChange={vi.fn()}
        studioId="std_123"
      />,
    );

    expect(screen.getByRole('button', { name: 'Export CSV' })).toBeDisabled();
  });

  it('renders an explicit failure state (not the empty-result message) when the issues query errors, and retry re-fetches', async () => {
    const user = userEvent.setup();
    const refetch = vi.fn();
    mocks.useShowRunReviewIssuesQuery.mockReturnValueOnce({
      data: undefined,
      isFetching: false,
      isLoading: false,
      isError: true,
      error: new Error('network down'),
      refetch,
    });

    render(
      <ShowRunSummary
        data={summary}
        search={{ tab: 'issues' }}
        onSearchChange={vi.fn()}
        studioId="std_123"
      />,
    );

    // On error, `data` is undefined just like a genuinely empty result — the
    // regression is treating the two identically. The DataTable (and its
    // empty-message copy) must not render at all in the error branch.
    expect(screen.queryByTestId('data-table')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Retry' }));
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it('enables export and fetches the full filtered set when the issues query returns rows', async () => {
    const user = userEvent.setup();
    mocks.useShowRunReviewIssuesQuery.mockReturnValueOnce({
      data: {
        data: [{ id: 'issue_1', title: 'Broken mic' }],
        meta: { page: 1, limit: 10, total: 3, totalPages: 1 },
      },
      isFetching: false,
      isLoading: false,
    });
    mocks.getShowRunReviewIssues.mockResolvedValue({
      data: [{ id: 'issue_1', title: 'Broken mic' }],
      meta: { page: 1, limit: 100, total: 3, totalPages: 1 },
    });

    render(
      <ShowRunSummary
        data={summary}
        search={{ tab: 'issues' }}
        onSearchChange={vi.fn()}
        studioId="std_123"
      />,
    );

    const exportButton = screen.getByRole('button', { name: 'Export CSV' });
    expect(exportButton).not.toBeDisabled();

    await user.click(exportButton);

    // Unlike the other four tabs, the issues export fetches through the
    // 100-row server cap, not `limit: total` — a single page is enough
    // here since total (3) fits in one page.
    await waitFor(() => {
      expect(mocks.getShowRunReviewIssues).toHaveBeenCalledWith('std_123', {
        date_from: summary.date_from,
        date_to: summary.date_to,
        page: 1,
        limit: 100,
        search: undefined,
        severity: undefined,
      });
    });
    expect(mocks.getShowRunReviewIssues).toHaveBeenCalledTimes(1);
    expect(mocks.exportShowRunReviewIssues).toHaveBeenCalledWith(
      [{ id: 'issue_1', title: 'Broken mic' }],
      { dateFrom: summary.date_from, dateTo: summary.date_to },
    );
  });

  it('pages the issues export in 100-row batches and concatenates when total exceeds the server cap', async () => {
    const user = userEvent.setup();
    // This file has no shared beforeEach mock reset; clear call history from
    // earlier tests sharing this hoisted mock so the count assertions below
    // reflect only this test's export.
    mocks.getShowRunReviewIssues.mockClear();
    const page1 = Array.from({ length: 100 }, (_, i) => ({ id: `issue_${i}`, title: `Issue ${i}` }));
    const page2 = [{ id: 'issue_150', title: 'Issue 150' }];
    mocks.useShowRunReviewIssuesQuery.mockReturnValueOnce({
      data: {
        data: page1.slice(0, 10),
        meta: { page: 1, limit: 10, total: 101, totalPages: 11 },
      },
      isFetching: false,
      isLoading: false,
    });
    mocks.getShowRunReviewIssues
      .mockResolvedValueOnce({ data: page1, meta: { page: 1, limit: 100, total: 101, totalPages: 2 } })
      .mockResolvedValueOnce({ data: page2, meta: { page: 2, limit: 100, total: 101, totalPages: 2 } });

    render(
      <ShowRunSummary
        data={summary}
        search={{ tab: 'issues' }}
        onSearchChange={vi.fn()}
        studioId="std_123"
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Export CSV' }));

    await waitFor(() => {
      expect(mocks.exportShowRunReviewIssues).toHaveBeenCalledWith(
        [...page1, ...page2],
        { dateFrom: summary.date_from, dateTo: summary.date_to },
      );
    });
    expect(mocks.getShowRunReviewIssues).toHaveBeenCalledTimes(2);
    expect(mocks.getShowRunReviewIssues).toHaveBeenNthCalledWith(1, 'std_123', expect.objectContaining({ page: 1, limit: 100 }));
    expect(mocks.getShowRunReviewIssues).toHaveBeenNthCalledWith(2, 'std_123', expect.objectContaining({ page: 2, limit: 100 }));
  });
});
