import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import type { ShowPerformanceResponse } from '@eridu/api-types/performance';

import { PerformanceShowsTable } from '../performance-shows-table';

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children }: { children?: ReactNode }) => <a href="#">{children}</a>,
}));

const performanceShow: ShowPerformanceResponse = {
  id: 'show_1',
  name: 'June Live Show',
  start_time: '2026-06-01T10:00:00.000Z',
  end_time: '2026-06-01T11:00:00.000Z',
  client_name: 'Acme Client',
  show_type_name: 'Live',
  platforms: [
    {
      show_platform_uid: 'sp_1',
      platform_id: 'platform_1',
      platform_name: 'TikTok',
      gmv: '1234.50',
      views: 1000,
      ctr: '12.34',
      cto: '5.67',
    },
  ],
};

const baseProps = {
  data: [performanceShow],
  total: 1,
  page: 1,
  limit: 10,
  isLoading: false,
  isFetching: false,
  isRefreshing: false,
  onPageChange: vi.fn(),
  onLimitChange: vi.fn(),
  studioId: 'std_1',
  search: {
    page: 1,
    limit: 10,
    has_performance: 'true',
  },
  updateSearch: vi.fn(),
  onRefresh: vi.fn(),
};

describe('performanceShowsTable', () => {
  it('renders GMV for rows returned by the performance-record filter', () => {
    render(
      <PerformanceShowsTable
        {...baseProps}
        locale="th-TH"
        currency="THB"
      />,
    );

    expect(screen.getByText('June Live Show')).toBeInTheDocument();
    expect(screen.getByText('฿1,234.50')).toBeInTheDocument();
  });
});
