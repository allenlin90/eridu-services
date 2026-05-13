import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ShowCreatorCompensationDialog } from '../show-creator-compensation-dialog';

const mockUseStudioCompensationLineItems = vi.fn();
const mockUseShowCreatorCompensationSummary = vi.fn();
const mockCreateMutateAsync = vi.fn();
const mockUpdateMutateAsync = vi.fn();
const mockDeleteMutate = vi.fn();

const lineItemsResponse = {
  data: [
    {
      id: 'comp_item_1',
      studio_id: 'std_1',
      target_type: 'SHOW_CREATOR',
      target_id: 'show_mc_1',
      amount: '25.00',
      item_type: 'BONUS',
      reason: 'Launch bonus',
      metadata: {},
      created_by_id: 'user_1',
      created_at: '2026-03-20T10:00:00.000Z',
      updated_at: '2026-03-20T10:00:00.000Z',
      deleted_at: null,
    },
  ],
  meta: { total: 1, page: 1, limit: 100, totalPages: 1 },
};

vi.mock('@eridu/ui', () => ({
  Button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => <button type={props.type ?? 'button'} {...props}>{children}</button>,
  Dialog: ({ open, children }: { open: boolean; children: ReactNode }) => (open ? <div>{children}</div> : null),
  DialogContent: ({ children, className }: { children: ReactNode; className?: string }) => (
    <div data-testid="show-creator-compensation-dialog-content" className={className}>{children}</div>
  ),
  DialogDescription: ({ children }: { children: ReactNode }) => <p>{children}</p>,
  DialogFooter: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: ReactNode }) => <h2>{children}</h2>,
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} />,
  Label: ({ children, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) => <label {...props}>{children}</label>,
  Select: ({
    children,
    value,
    onValueChange,
  }: {
    children: ReactNode;
    value?: string;
    onValueChange?: (value: string) => void;
  }) => (
    <select aria-label="item-type" value={value} onChange={(event) => onValueChange?.(event.target.value)}>
      {children}
    </select>
  ),
  SelectContent: ({ children }: { children: ReactNode }) => <>{children}</>,
  SelectItem: ({ children, value }: { children: ReactNode; value: string }) => <option value={value}>{children}</option>,
  SelectTrigger: ({ children }: { children: ReactNode }) => <>{children}</>,
  SelectValue: () => null,
  Textarea: (props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => <textarea {...props} />,
}));

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

vi.mock('@/features/compensation-line-items/api/compensation-line-items.api', () => ({
  useStudioCompensationLineItems: (...args: unknown[]) => mockUseStudioCompensationLineItems(...args),
}));

vi.mock('@/features/compensation-line-items/hooks/use-compensation-line-item-mutations', () => ({
  useCreateStudioCompensationLineItem: () => ({
    mutateAsync: mockCreateMutateAsync,
    isPending: false,
  }),
  useUpdateStudioCompensationLineItem: () => ({
    mutateAsync: mockUpdateMutateAsync,
    isPending: false,
  }),
  useDeleteStudioCompensationLineItem: () => ({
    mutate: mockDeleteMutate,
    isPending: false,
  }),
}));

vi.mock('@/features/studio-show-creators/api/get-show-creators', () => ({
  useShowCreatorCompensationSummary: (...args: unknown[]) => mockUseShowCreatorCompensationSummary(...args),
}));

function renderDialog() {
  return render(
    <ShowCreatorCompensationDialog
      open
      onOpenChange={vi.fn()}
      studioId="std_1"
      showId="show_1"
      creator={{
        id: 'show_mc_1',
        creator_id: 'creator_1',
        creator_name: 'Alice',
        creator_alias_name: 'Ali',
        note: null,
        agreed_rate: '150.00',
        compensation_type: 'FIXED',
        commission_rate: null,
        metadata: {},
      }}
    />,
  );
}

describe('showCreatorCompensationDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseShowCreatorCompensationSummary.mockReturnValue({
      data: {
        show_id: 'show_1',
        total_amount: '175.00',
        unresolved_count: 0,
        creators: [
          {
            show_creator_id: 'show_mc_1',
            creator_id: 'creator_1',
            creator_name: 'Alice',
            creator_alias_name: 'Ali',
            compensation_type: 'FIXED',
            agreed_rate: '150.00',
            commission_rate: null,
            base_amount: '150.00',
            adjustment_total: '25.00',
            total_amount: '175.00',
            unresolved_reason: null,
          },
        ],
      },
    });
    mockUseStudioCompensationLineItems.mockReturnValue({ data: lineItemsResponse });
  });

  it('renders backend totals and creates SHOW_CREATOR line items against the assignment UID', async () => {
    const user = userEvent.setup();
    renderDialog();

    expect(screen.getByText('150.00')).toBeInTheDocument();
    expect(screen.getAllByText('175.00')).toHaveLength(2);
    await screen.findByText('Launch bonus');

    await user.clear(screen.getByLabelText('Amount'));
    await user.type(screen.getByLabelText('Amount'), '10');
    await user.type(screen.getByLabelText('Reason'), 'Extra prep');
    await user.click(screen.getByRole('button', { name: 'Create Item' }));

    await waitFor(() => {
      expect(mockCreateMutateAsync).toHaveBeenCalledWith({
        target_type: 'SHOW_CREATOR',
        target_id: 'show_mc_1',
        amount: '10.00',
        item_type: 'BONUS',
        reason: 'Extra prep',
      });
    });
  });

  it('updates and deletes existing adjustment items', async () => {
    const user = userEvent.setup();
    renderDialog();

    await screen.findByText('Launch bonus');
    await user.click(screen.getByRole('button', { name: 'Edit compensation item Launch bonus' }));
    await user.clear(screen.getByLabelText('Amount'));
    await user.type(screen.getByLabelText('Amount'), '30');
    await user.click(screen.getByRole('button', { name: 'Update Item' }));

    expect(mockUpdateMutateAsync).toHaveBeenCalledWith({
      id: 'comp_item_1',
      data: {
        amount: '30.00',
        item_type: 'BONUS',
        reason: 'Launch bonus',
      },
    });

    await user.click(screen.getByRole('button', { name: 'Delete compensation item Launch bonus' }));

    expect(mockDeleteMutate).toHaveBeenCalledWith('comp_item_1');
  });

  it('uses a wider desktop layout and avoids a cramped three-field form row', () => {
    renderDialog();

    expect(screen.getByTestId('show-creator-compensation-dialog-content')).toHaveClass('sm:max-w-[860px]');
    expect(screen.getByLabelText('Reason').closest('div')).toHaveClass('md:col-span-2');
  });
});
