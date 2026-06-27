import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { format, parseISO } from 'date-fns';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import type { ShiftCostResponse } from '@eridu/api-types/costs';

import { ShiftCostsTable } from '../shift-costs-table';

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children }: { children?: ReactNode }) => <a href="#">{children}</a>,
}));

vi.mock('@eridu/ui/hooks/use-is-mobile', () => ({
  useIsMobile: () => true,
}));

const mockShiftCost: ShiftCostResponse = {
  id: 'shift_sft123',
  date: '2026-06-07',
  member_name: 'John Operator',
  member_role: 'OPERATOR',
  hourly_rate: '250.00',
  status: 'COMPLETED',
  blocks: [
    {
      block_uid: 'sb_blk123',
      start_time: '2026-06-07T08:00:00.000Z',
      end_time: '2026-06-07T12:00:00.000Z',
      actual_start_time: '2026-06-07T08:00:00.000Z',
      actual_end_time: '2026-06-07T12:00:00.000Z',
      duration_hours: '4.0',
      line_item_subtotal: '50.00',
      total_cost: '1050.00',
      calculation_warnings: [],
    },
  ],
  line_item_subtotal: '50.00',
  total_cost: '1050.00',
  unresolved_reasons: [],
  calculation_warnings: [],
  actuals_source: 'ACTUALS',
};

const baseProps = {
  data: [mockShiftCost],
  total: 1,
  page: 1,
  limit: 10,
  isLoading: false,
  isFetching: false,
  onPageChange: vi.fn(),
  onLimitChange: vi.fn(),
  search: {
    page: 1,
    limit: 10,
  },
  updateSearch: vi.fn(),
};

describe('shiftCostsTable', () => {
  it('renders shift details and labor costs', () => {
    render(
      <ShiftCostsTable
        {...baseProps}
        locale="th-TH"
        currency="THB"
      />,
    );

    expect(screen.getByText('John Operator')).toBeInTheDocument();
    expect(screen.getAllByText('฿1,050.00')[0]).toBeInTheDocument();
  });

  it('drives the member_name query state when typing in the operator search', async () => {
    const updateSearch = vi.fn();
    render(
      <ShiftCostsTable
        {...baseProps}
        updateSearch={updateSearch}
        locale="th-TH"
        currency="THB"
      />,
    );

    fireEvent.change(screen.getByPlaceholderText('Search operator...'), {
      target: { value: 'John' },
    });

    await waitFor(() =>
      expect(updateSearch).toHaveBeenCalledWith({ member_name: 'John', page: 1 }),
    );
  });

  it('renders timezone-aware shift date and block times', () => {
    const startLocal = new Date(2026, 5, 7, 8, 0, 0);
    const endLocal = new Date(2026, 5, 7, 12, 0, 0);
    const customShiftCost = {
      ...mockShiftCost,
      blocks: [
        {
          ...mockShiftCost.blocks[0],
          start_time: startLocal.toISOString(),
          end_time: endLocal.toISOString(),
        },
      ],
    };

    render(
      <ShiftCostsTable
        {...baseProps}
        data={[customShiftCost]}
        locale="th-TH"
        currency="THB"
      />,
    );

    const block = customShiftCost.blocks[0];
    const expectedStart = format(parseISO(block.start_time), 'HH:mm');
    const expectedEnd = format(parseISO(block.end_time), 'HH:mm');

    expect(screen.getByText(`Planned: ${expectedStart} - ${expectedEnd}`)).toBeInTheDocument();
  });

  it('toggles WarningTooltip when clicked/tapped', async () => {
    const shiftCostWithWarnings = {
      ...mockShiftCost,
      total_cost: null,
      unresolved_reasons: ['No signed-in hour logs'],
      calculation_warnings: ['Excessive duration'],
      blocks: [
        {
          ...mockShiftCost.blocks[0],
          calculation_warnings: ['Block overlap warning'],
        },
      ],
    };

    render(
      <ShiftCostsTable
        {...baseProps}
        data={[shiftCostWithWarnings]}
        locale="th-TH"
        currency="THB"
      />,
    );

    const blockWarningTrigger = screen.getByText('Warning');
    fireEvent.click(blockWarningTrigger);
    expect(screen.getAllByText('Block Warning(s):')[0]).toBeInTheDocument();
    expect(screen.getAllByText('Block overlap warning')[0]).toBeInTheDocument();

    const unresolvedBadge = screen.getByText('Unresolved');
    fireEvent.click(unresolvedBadge);
    expect(screen.getAllByText('Unresolved billing issues:')[0]).toBeInTheDocument();
    expect(screen.getAllByText('No signed-in hour logs')[0]).toBeInTheDocument();

    const warningsTrigger = screen.getByText('Warnings');
    fireEvent.click(warningsTrigger);
    expect(screen.getAllByText('Calculation warning(s):')[0]).toBeInTheDocument();
    expect(screen.getAllByText('Excessive duration')[0]).toBeInTheDocument();
  });
});
