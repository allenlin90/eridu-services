import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import type { ShowRunReviewSummary } from '@eridu/api-types/shows';

import { ShowRunSummary } from '../show-run-summary';

const mocks = vi.hoisted(() => ({
  getShowRunReviewCreators: vi.fn(),
  getShowRunReviewShows: vi.fn(),
  getShowRunReviewTasks: vi.fn(),
  getShowRunReviewViolations: vi.fn(),
  exportShowRunReviewCreators: vi.fn(),
  exportShowRunReviewShows: vi.fn(),
  exportShowRunReviewTasks: vi.fn(),
  exportShowRunReviewViolations: vi.fn(),
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
});
