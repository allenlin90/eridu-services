import { fireEvent, render, screen } from '@testing-library/react';
import { format, parseISO } from 'date-fns';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import type { ShowCostResponse } from '@eridu/api-types/costs';

import { ShowCostsTable } from '../show-costs-table';

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children }: { children?: ReactNode }) => <a href="#">{children}</a>,
}));

vi.mock('@/features/shows/api/get-show-lookups', () => ({
  useShowLookupsQuery: () => ({
    data: {
      clients: [],
      show_types: [],
      platforms: [],
      show_standards: [],
    },
  }),
}));

const mockShowCost: ShowCostResponse = {
  id: 'show_abc123',
  name: 'Special Promotion Live',
  start_time: '2026-06-07T08:00:00.000Z',
  end_time: '2026-06-07T10:00:00.000Z',
  client_name: 'Brand Client A',
  show_type_name: 'Studio Live',
  show_standard_name: 'Standard HD',
  creators: [
    {
      show_creator_uid: 'sc_cre123',
      creator_name: 'Alice Creator',
      creator_alias_name: 'alice',
      compensation_type: 'FLAT_RATE',
      agreed_rate: '1500.00',
      commission_rate: null,
      base_amount: '1500.00',
      adjustment_total: '0.00',
      total_amount: '1500.00',
      unresolved_reason: null,
    },
  ],
  line_item_subtotal: '200.00',
  total_cost: '1700.00',
  unresolved_reasons: [],
  calculation_warnings: [],
  actuals_source: 'PLAN',
};

const baseProps = {
  data: [mockShowCost],
  total: 1,
  page: 1,
  limit: 10,
  isLoading: false,
  isFetching: false,
  onPageChange: vi.fn(),
  onLimitChange: vi.fn(),
  studioId: 'studio_xyz',
  search: {
    page: 1,
    limit: 10,
  },
  updateSearch: vi.fn(),
};

describe('showCostsTable', () => {
  it('renders show details and total payouts', () => {
    render(
      <ShowCostsTable
        {...baseProps}
        locale="th-TH"
        currency="THB"
      />,
    );

    expect(screen.getByText('Special Promotion Live')).toBeInTheDocument();
    expect(screen.getByText('Alice Creator')).toBeInTheDocument();
    expect(screen.getByText('฿1,700.00')).toBeInTheDocument();
  });

  it('renders timezone-aware schedule times and handles same-day show format', () => {
    const startLocal = new Date(2026, 5, 7, 8, 0, 0);
    const endLocal = new Date(2026, 5, 7, 10, 0, 0);
    const sameDayCost = {
      ...mockShowCost,
      start_time: startLocal.toISOString(),
      end_time: endLocal.toISOString(),
    };

    render(
      <ShowCostsTable
        {...baseProps}
        data={[sameDayCost]}
        locale="th-TH"
        currency="THB"
      />,
    );

    const start = parseISO(sameDayCost.start_time);
    const end = parseISO(sameDayCost.end_time);
    const expectedStartStr = format(start, 'MMM d, yyyy HH:mm');
    const expectedEndStr = format(end, 'HH:mm');

    expect(screen.getByText(expectedStartStr)).toBeInTheDocument();
    expect(screen.getByText(`to ${expectedEndStr}`)).toBeInTheDocument();
  });

  it('renders timezone-aware schedule times and handles multi-day show format', () => {
    const startLocal = new Date(2026, 5, 7, 8, 0, 0);
    const endLocal = new Date(2026, 5, 8, 10, 0, 0);
    const multiDayShowCost = {
      ...mockShowCost,
      start_time: startLocal.toISOString(),
      end_time: endLocal.toISOString(),
    };

    render(
      <ShowCostsTable
        {...baseProps}
        data={[multiDayShowCost]}
        locale="th-TH"
        currency="THB"
      />,
    );

    const start = parseISO(multiDayShowCost.start_time);
    const end = parseISO(multiDayShowCost.end_time);
    const expectedStartStr = format(start, 'MMM d, yyyy HH:mm');
    const expectedEndStr = format(end, 'MMM d, yyyy HH:mm');

    expect(screen.getByText(expectedStartStr)).toBeInTheDocument();
    expect(screen.getByText(`to ${expectedEndStr}`)).toBeInTheDocument();
  });

  it('toggles warning tooltip popover when clicked/tapped', async () => {
    const showCostWithWarnings = {
      ...mockShowCost,
      total_cost: null,
      unresolved_reasons: ['Missing creator rate info'],
      calculation_warnings: ['Rate discrepancy detected'],
    };

    render(
      <ShowCostsTable
        {...baseProps}
        data={[showCostWithWarnings]}
        locale="th-TH"
        currency="THB"
      />,
    );

    const unresolvedBadge = screen.getByText('Unresolved');
    expect(unresolvedBadge).toBeInTheDocument();

    fireEvent.click(unresolvedBadge);
    expect(screen.getAllByText('Unresolved billing issues:')[0]).toBeInTheDocument();
    expect(screen.getAllByText('Missing creator rate info')[0]).toBeInTheDocument();

    const warningsTrigger = screen.getByText('Warnings');
    expect(warningsTrigger).toBeInTheDocument();

    fireEvent.click(warningsTrigger);
    expect(screen.getAllByText('Calculation warning(s):')[0]).toBeInTheDocument();
    expect(screen.getAllByText('Rate discrepancy detected')[0]).toBeInTheDocument();
  });
});
