import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { Route, ScheduleSnapshotsList } from '@/routes/admin/schedules/$scheduleId/snapshots';

// Mock dependencies
vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(() => ({ data: [], isLoading: false, refetch: vi.fn() })),
  useIsFetching: vi.fn(() => 0),
}));

vi.mock('@tanstack/react-router', () => ({
  createFileRoute: vi.fn(() => vi.fn(() => ({
    useParams: vi.fn(() => ({ scheduleId: '123' })),
    useSearch: vi.fn(),
  }))),
  Link: ({ children, to, search }: any) => (
    <a href={to} data-search={JSON.stringify(search)}>
      {children}
    </a>
  ),
  useRouter: vi.fn(),
  useNavigate: vi.fn(),
}));

// Mock Route.useParams
vi.spyOn(Route, 'useParams').mockReturnValue({ scheduleId: '123' });

// Mock AdminLayout to render breadcrumbs
vi.mock('@/features/admin/components', () => ({
  AdminLayout: ({ children, breadcrumbs, title }: any) => (
    <div data-testid="admin-layout">
      <h1>{title}</h1>
      <div data-testid="breadcrumbs-container">{breadcrumbs}</div>
      {children}
    </div>
  ),
  AdminTable: () => <div data-testid="admin-table">Table</div>,
}));

// Mock @eridu/ui components
vi.mock('@eridu/ui', () => ({
  Breadcrumb: ({ children }: any) => <nav>{children}</nav>,
  BreadcrumbList: ({ children }: any) => <ol>{children}</ol>,
  BreadcrumbItem: ({ children }: any) => <li>{children}</li>,
  BreadcrumbLink: ({ children }: any) => <span>{children}</span>,
  BreadcrumbPage: ({ children }: any) => <span aria-current="page">{children}</span>,
  BreadcrumbSeparator: () => <span aria-hidden="true">/</span>,
}));

vi.mock('@/lib/api/admin', () => ({
  adminApi: {
    customGet: vi.fn(),
  },
}));

describe('scheduleSnapshotsList', () => {
  it('renders breadcrumbs correctly', () => {
    render(<ScheduleSnapshotsList />);

    const breadcrumbsContainer = screen.getByTestId('breadcrumbs-container');
    expect(breadcrumbsContainer).toBeInTheDocument();

    // Check for "Schedules" link
    const schedulesLink = screen.getByText('Schedules');
    expect(schedulesLink).toBeInTheDocument();
    expect(schedulesLink.closest('a')).toHaveAttribute('href', '/admin/schedules');

    // Check for "Schedule Details" link
    const detailsLink = screen.getByText('Schedule Details');
    expect(detailsLink).toBeInTheDocument();
    expect(detailsLink.closest('a')).toHaveAttribute('href', '/admin/schedules');

    // Check for "Snapshots" page indicator
    const snapshotsPage = screen.getByText('Snapshots');
    expect(snapshotsPage).toBeInTheDocument();
  });

  it('passes search params to links', () => {
    render(<ScheduleSnapshotsList />);

    const schedulesLink = screen.getByText('Schedules').closest('a');
    expect(schedulesLink).toHaveAttribute('data-search', JSON.stringify({ page: 1, pageSize: 10 }));
  });
});
