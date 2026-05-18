import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import type { StudioMemberCompensationResponse } from '@eridu/api-types/memberships';

import { MemberCompensationsView } from '../member-compensations-view';

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to, params, ...props }: any) => (
    <a
      href={typeof to === 'string' ? to.replace('$studioId', params?.studioId ?? '') : '#'}
      data-testid="mock-link"
      {...props}
    >
      {children}
    </a>
  ),
}));

const mockData: StudioMemberCompensationResponse = {
  membership_id: 'smb_test123',
  user_id: 'user_abc123',
  user_name: 'Jane Doe',
  user_email: 'jane@example.com',
  date_from: '2026-05-01',
  date_to: '2026-05-31',
  summary: {
    shift_count: 1,
    total_planned_cost: '125.00',
    total_actual_cost: '100.00',
    actual_cost_resolved_shift_count: 1,
    actual_cost_pending_shift_count: 0,
  },
  shifts: [
    {
      shift_id: 'ssh_test123',
      date: '2026-05-12',
      status: 'COMPLETED',
      is_duty_manager: false,
      hourly_rate: '25.00',
      planned_cost: '125.00',
      actual_cost: '100.00',
      actuals_status: 'resolved',
      blocks: [
        {
          block_id: 'ssb_1',
          start_time: '2026-05-12T09:00:00.000Z',
          end_time: '2026-05-12T14:00:00.000Z',
          actual_start_time: '2026-05-12T09:00:00.000Z',
          actual_end_time: '2026-05-12T13:00:00.000Z',
        },
      ],
    },
  ],
};

const baseProps = {
  studioId: 'std_test',
  dateRange: { from: new Date('2026-05-01T00:00:00'), to: new Date('2026-05-31T00:00:00') },
  onDateRangeChange: vi.fn(),
  onRefresh: vi.fn(),
};

describe('memberCompensationsView', () => {
  it('renders the loading placeholder when query is loading', () => {
    render(
      <MemberCompensationsView
        {...baseProps}
        data={undefined}
        isLoading
        isFetching
        isError={false}
      />,
    );

    expect(screen.getByText('Loading compensations...')).toBeInTheDocument();
  });

  it('renders the empty-state copy when there are no shifts', () => {
    render(
      <MemberCompensationsView
        {...baseProps}
        data={{ ...mockData, shifts: [], summary: { ...mockData.summary, shift_count: 0 } }}
        isLoading={false}
        isFetching={false}
        isError={false}
      />,
    );

    expect(screen.getByText('No shifts in this range.')).toBeInTheDocument();
  });

  it('renders the destructive error copy when the query fails', () => {
    render(
      <MemberCompensationsView
        {...baseProps}
        data={undefined}
        isLoading={false}
        isFetching={false}
        isError
      />,
    );

    expect(screen.getByText('Failed to load member compensations.')).toBeInTheDocument();
    expect(screen.queryByText('No shifts in this range.')).not.toBeInTheDocument();
  });

  it('renders the data row with formatted money fields', () => {
    render(
      <MemberCompensationsView
        {...baseProps}
        data={mockData}
        isLoading={false}
        isFetching={false}
        isError={false}
      />,
    );

    expect(screen.getByText('Jane Doe')).toBeInTheDocument();
    expect(screen.getByText('2026-05-12')).toBeInTheDocument();
    expect(screen.getByText('COMPLETED')).toBeInTheDocument();
    expect(screen.getByText('$25.00')).toBeInTheDocument();
    expect(screen.getAllByText('$125.00')).toHaveLength(2);
    expect(screen.getAllByText('$100.00')).toHaveLength(2);
  });

  it('shows "Pending" when actual_cost is null', () => {
    render(
      <MemberCompensationsView
        {...baseProps}
        data={{
          ...mockData,
          summary: { ...mockData.summary, actual_cost_pending_shift_count: 1, total_actual_cost: '0.00' },
          shifts: [{ ...mockData.shifts[0], actual_cost: null, actuals_status: 'pending' }],
        }}
        isLoading={false}
        isFetching={false}
        isError={false}
      />,
    );

    // "Pending" matches both the summary card title and the unresolved actual_cost cell.
    expect(screen.getAllByText('Pending').length).toBeGreaterThanOrEqual(2);
  });

  it('renders cancelled shifts with the cancelled badge and zeroed costs', () => {
    render(
      <MemberCompensationsView
        {...baseProps}
        data={{
          ...mockData,
          summary: { ...mockData.summary, shift_count: 0, total_planned_cost: '0.00', total_actual_cost: '0.00' },
          shifts: [
            {
              ...mockData.shifts[0],
              shift_id: 'ssh_cancelled',
              status: 'CANCELLED',
              planned_cost: '0.00',
              actual_cost: null,
              actuals_status: 'cancelled',
            },
          ],
        }}
        isLoading={false}
        isFetching={false}
        isError={false}
      />,
    );

    expect(screen.getByText('CANCELLED')).toBeInTheDocument();
    // $0.00 appears in summary cards (planned + actual) and the row's planned cell.
    expect(screen.getAllByText('$0.00').length).toBeGreaterThanOrEqual(3);
    // "Pending" matches both the summary "Pending" card title and the null actual_cost cell.
    expect(screen.getAllByText('Pending').length).toBeGreaterThanOrEqual(2);
  });

  it('fires onRefresh when the refresh button is clicked', async () => {
    const onRefresh = vi.fn();
    const user = userEvent.setup();
    render(
      <MemberCompensationsView
        {...baseProps}
        onRefresh={onRefresh}
        data={mockData}
        isLoading={false}
        isFetching={false}
        isError={false}
      />,
    );

    await user.click(screen.getByLabelText('Refresh member compensations'));
    expect(onRefresh).toHaveBeenCalledOnce();
  });
});
