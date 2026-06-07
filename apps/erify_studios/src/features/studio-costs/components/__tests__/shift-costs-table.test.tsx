import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import type { ShiftCostResponse } from '@eridu/api-types/costs';

import { ShiftCostsTable } from '../shift-costs-table';

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children }: { children?: ReactNode }) => <a href="#">{children}</a>,
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
});
