import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { CreatorCompensationReviewDialog } from '../creator-compensation-review-dialog';

const mockUseStudioCreatorCompensationReview = vi.fn();

vi.mock('@eridu/ui', () => ({
  Badge: ({ children }: { children: ReactNode }) => <span>{children}</span>,
  Button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button type={props.type ?? 'button'} {...props}>{children}</button>
  ),
  DatePickerWithRange: () => <div data-testid="date-range-picker" />,
  Dialog: ({ open, children }: { open: boolean; children: ReactNode }) => (open ? <div>{children}</div> : null),
  DialogContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogDescription: ({ children }: { children: ReactNode }) => <p>{children}</p>,
  DialogHeader: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: ReactNode }) => <h2>{children}</h2>,
}));

vi.mock('../../api/studio-creator-roster', () => ({
  useStudioCreatorCompensationReview: (...args: unknown[]) => mockUseStudioCreatorCompensationReview(...args),
}));

vi.mock('@/features/studio-show-creators/components/show-creator-compensation-dialog', () => ({
  ShowCreatorCompensationDialog: () => <div data-testid="show-creator-compensation-dialog" />,
}));

describe('creatorCompensationReviewDialog', () => {
  it('renders per-creator show compensation totals for the selected date range', () => {
    mockUseStudioCreatorCompensationReview.mockReturnValue({
      isLoading: false,
      refetch: vi.fn(),
      data: {
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
      },
    });

    render(
      <CreatorCompensationReviewDialog
        open
        onOpenChange={vi.fn()}
        studioId="std_1"
        creator={{
          id: 'smc_1',
          creator_id: 'creator_1',
          creator_name: 'Alice',
          creator_alias_name: 'Ali',
          default_rate: '100.00',
          default_rate_type: 'FIXED',
          default_commission_rate: null,
          is_active: true,
          version: 1,
          metadata: {},
          created_at: '2026-05-01T00:00:00.000Z',
          updated_at: '2026-05-01T00:00:00.000Z',
        }}
      />,
    );

    expect(screen.getByText('Creator Compensation Review')).toBeInTheDocument();
    expect(screen.getByTestId('date-range-picker')).toBeInTheDocument();
    expect(screen.getByText('May Show')).toBeInTheDocument();
    expect(screen.getAllByText('125.00')).toHaveLength(2);
    expect(screen.getByRole('button', { name: 'Edit terms for May Show' })).toBeInTheDocument();
  });
});
