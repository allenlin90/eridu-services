import { render, screen } from '@testing-library/react';
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
});
