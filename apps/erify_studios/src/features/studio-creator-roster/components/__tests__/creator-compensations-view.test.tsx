import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import type { StudioCreatorCompensationResponse } from '@eridu/api-types/studio-creators';

import { CreatorCompensationsView } from '../creator-compensations-view';

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to, params, ...props }: any) => (
    <a
      href={typeof to === 'string'
        ? to
            .replace('$studioId', params?.studioId ?? '')
            .replace('$showId', params?.showId ?? '')
        : '#'}
      data-testid="mock-link"
      {...props}
    >
      {children}
    </a>
  ),
}));

vi.mock('@eridu/ui', () => ({
  Badge: ({ children }: { children: ReactNode }) => <span>{children}</span>,
  Button: ({ children, asChild: _asChild, ...props }: any) => (
    <button type={props.type ?? 'button'} {...props}>{children}</button>
  ),
  Card: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  CardContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  CardHeader: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  CardTitle: ({ children }: { children: ReactNode }) => <h3>{children}</h3>,
  DatePickerWithRange: () => <div data-testid="date-range-picker" />,
}));

vi.mock('@/features/studio-show-creators/components/show-creator-compensation-dialog', () => ({
  ShowCreatorCompensationDialog: () => <div data-testid="show-creator-compensation-dialog" />,
}));

const mockData: StudioCreatorCompensationResponse = {
  creator_id: 'creator_1',
  creator_name: 'Alice',
  creator_alias_name: 'Ali',
  date_from: '2026-05-01T00:00:00.000Z',
  date_to: '2026-05-31T23:59:59.999Z',
  total_amount: '125.00',
  unresolved_count: 0,
  shows: [
    {
      show_id: 'show_1',
      show_name: 'May Show',
      show_start_time: '2026-05-10T10:00:00.000Z',
      show_end_time: '2026-05-10T12:00:00.000Z',
      show_creator_id: 'show_mc_1',
      creator_id: 'creator_1',
      creator_name: 'Alice',
      creator_alias_name: 'Ali',
      note: 'Existing note',
      compensation_type: 'FIXED',
      agreed_rate: '100.00',
      commission_rate: null,
      base_amount: '100.00',
      adjustment_total: '25.00',
      total_amount: '125.00',
      unresolved_reason: null,
    },
  ],
};

const baseProps = {
  studioId: 'std_1',
  dateRange: { from: new Date('2026-05-01T00:00:00'), to: new Date('2026-05-31T00:00:00') },
  onDateRangeChange: vi.fn(),
  onRefresh: vi.fn(),
};

describe('creatorCompensationsView', () => {
  it('renders the loading placeholder when query is loading', () => {
    render(
      <CreatorCompensationsView
        {...baseProps}
        data={undefined}
        isLoading
        isFetching
        isError={false}
      />,
    );

    expect(screen.getByText('Loading compensations...')).toBeInTheDocument();
  });

  it('renders the empty-state copy when there are no shows', () => {
    render(
      <CreatorCompensationsView
        {...baseProps}
        data={{ ...mockData, shows: [], total_amount: '0.00', unresolved_count: 0 }}
        isLoading={false}
        isFetching={false}
        isError={false}
      />,
    );

    expect(screen.getByText('No show assignments in this range.')).toBeInTheDocument();
  });

  it('renders the destructive error copy when the query fails', () => {
    render(
      <CreatorCompensationsView
        {...baseProps}
        data={undefined}
        isLoading={false}
        isFetching={false}
        isError
      />,
    );

    expect(screen.getByText('Failed to load creator compensations.')).toBeInTheDocument();
    expect(screen.queryByText('No show assignments in this range.')).not.toBeInTheDocument();
  });

  it('renders per-show compensation rows and totals', () => {
    render(
      <CreatorCompensationsView
        {...baseProps}
        data={mockData}
        isLoading={false}
        isFetching={false}
        isError={false}
      />,
    );

    expect(screen.getByTestId('date-range-picker')).toBeInTheDocument();
    expect(screen.getByText('May Show')).toBeInTheDocument();
    expect(screen.getAllByText('125.00')).toHaveLength(2);
    expect(screen.getByRole('button', { name: 'Edit terms for May Show' })).toBeInTheDocument();
  });

  it('links each show row to the creator mapping drill-in', () => {
    render(
      <CreatorCompensationsView
        {...baseProps}
        data={mockData}
        isLoading={false}
        isFetching={false}
        isError={false}
      />,
    );

    expect(screen.getByRole('link', { name: 'Open show May Show' }))
      .toHaveAttribute('href', '/studios/std_1/creator-mapping/show_1');
  });

  it('fires onRefresh when the refresh button is clicked', async () => {
    const onRefresh = vi.fn();
    const user = userEvent.setup();
    render(
      <CreatorCompensationsView
        {...baseProps}
        onRefresh={onRefresh}
        data={mockData}
        isLoading={false}
        isFetching={false}
        isError={false}
      />,
    );

    await user.click(screen.getByLabelText('Refresh creator compensations'));
    expect(onRefresh).toHaveBeenCalledOnce();
  });
});
