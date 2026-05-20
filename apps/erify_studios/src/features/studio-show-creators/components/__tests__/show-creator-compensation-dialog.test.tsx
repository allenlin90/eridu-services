import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Children, isValidElement, type ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ShowCreatorCompensationDialog } from '../show-creator-compensation-dialog';

const mockUseStudioCompensationLineItems = vi.fn();
const mockUseShowCreatorCompensationSummary = vi.fn();
const mockCreateMutateAsync = vi.fn();
const mockUpdateMutateAsync = vi.fn();
const mockUpdateAssignmentMutateAsync = vi.fn();
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
  }) => {
    let triggerId: string | undefined;
    // eslint-disable-next-line react/no-children-for-each -- test-only mock; reading id off SelectTrigger child
    Children.forEach(children, (child) => {
      if (isValidElement(child) && (child.props as { id?: string }).id) {
        triggerId = (child.props as { id?: string }).id;
      }
    });
    return (
      <select id={triggerId} value={value} onChange={(event) => onValueChange?.(event.target.value)}>
        {children}
      </select>
    );
  },
  SelectContent: ({ children }: { children: ReactNode }) => <>{children}</>,
  SelectItem: ({
    children,
    value,
    disabled,
  }: {
    children: ReactNode;
    value: string;
    disabled?: boolean;
  }) => <option value={value} disabled={disabled}>{children}</option>,
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
  useUpdateShowCreatorAssignment: () => ({
    mutateAsync: mockUpdateAssignmentMutateAsync,
    isPending: false,
  }),
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

  it('updates per-show assignment compensation terms from the dialog', async () => {
    const user = userEvent.setup();
    renderDialog();

    expect(screen.getByText('Assignment Terms')).toBeInTheDocument();
    await user.clear(screen.getByLabelText('Agreed Rate'));
    await user.type(screen.getByLabelText('Agreed Rate'), '175');
    await user.type(screen.getByLabelText('Override Reason'), 'Negotiated for this show');
    await user.type(screen.getByLabelText('Assignment Note'), 'Updated host note');
    await user.click(screen.getByRole('button', { name: 'Save Terms' }));

    await waitFor(() => {
      expect(mockUpdateAssignmentMutateAsync).toHaveBeenCalledWith({
        id: 'show_mc_1',
        data: {
          note: 'Updated host note',
          agreed_rate: '175.00',
          compensation_type: 'FIXED',
          commission_rate: null,
          override_reason: 'Negotiated for this show',
        },
      });
    });
  });

  it('disables hybrid and commission assignment compensation options', () => {
    renderDialog();

    expect(screen.getByRole('option', { name: 'Fixed' })).not.toBeDisabled();
    expect(screen.getByRole('option', { name: 'Commission' })).toBeDisabled();
    expect(screen.getByRole('option', { name: 'Hybrid' })).toBeDisabled();
  });

  it('forces commission_rate to null when switching HYBRID → FIXED with a leftover commission value', async () => {
    const user = userEvent.setup();
    render(
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
          agreed_rate: '100.00',
          compensation_type: 'HYBRID',
          commission_rate: '25.00',
          metadata: {},
        }}
      />,
    );

    await user.selectOptions(screen.getByLabelText('Compensation Type'), 'FIXED');
    expect(screen.getByLabelText('Commission Rate')).toBeDisabled();

    await user.click(screen.getByRole('button', { name: 'Save Terms' }));

    await waitFor(() => {
      expect(mockUpdateAssignmentMutateAsync).toHaveBeenCalledWith({
        id: 'show_mc_1',
        data: {
          note: null,
          agreed_rate: '100.00',
          compensation_type: 'FIXED',
          commission_rate: null,
          override_reason: undefined,
        },
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

  it('renders human-readable copy for known unresolved reasons', () => {
    mockUseShowCreatorCompensationSummary.mockReturnValue({
      data: {
        show_id: 'show_1',
        total_amount: '0.00',
        unresolved_count: 1,
        creators: [
          {
            show_creator_id: 'show_mc_1',
            creator_id: 'creator_1',
            creator_name: 'Alice',
            creator_alias_name: 'Ali',
            compensation_type: null,
            agreed_rate: null,
            commission_rate: null,
            base_amount: null,
            adjustment_total: '0.00',
            total_amount: null,
            unresolved_reason: 'AGREEMENT_SNAPSHOT_MISSING',
          },
        ],
      },
    });

    renderDialog();

    expect(screen.getByText(/Compensation terms are missing/i)).toBeInTheDocument();
    expect(screen.queryByText('AGREEMENT_SNAPSHOT_MISSING')).not.toBeInTheDocument();
  });

  it('falls back to OTHER when editing a line item whose backend item_type is unknown', async () => {
    const user = userEvent.setup();
    mockUseStudioCompensationLineItems.mockReturnValue({
      data: {
        ...lineItemsResponse,
        data: [
          {
            ...lineItemsResponse.data[0],
            item_type: 'NEW_TYPE_FROM_BACKEND' as any,
          },
        ],
      },
    });

    renderDialog();

    await user.click(screen.getByRole('button', { name: 'Edit compensation item Launch bonus' }));

    expect(screen.getByLabelText('Item Type')).toHaveValue('OTHER');
  });

  it('normalizes long-precision amounts via string padding (no binary float drift)', async () => {
    const user = userEvent.setup();

    renderDialog();

    await user.clear(screen.getByLabelText('Amount'));
    await user.type(screen.getByLabelText('Amount'), '0.1');
    await user.type(screen.getByLabelText('Reason'), 'Penny');
    await user.click(screen.getByRole('button', { name: 'Create Item' }));

    await waitFor(() => {
      expect(mockCreateMutateAsync).toHaveBeenCalledWith({
        target_type: 'SHOW_CREATOR',
        target_id: 'show_mc_1',
        amount: '0.10',
        item_type: 'BONUS',
        reason: 'Penny',
      });
    });
  });

  it('rounds amounts with more than two decimals half-away-from-zero instead of truncating', async () => {
    const user = userEvent.setup();

    renderDialog();

    await user.clear(screen.getByLabelText('Amount'));
    await user.type(screen.getByLabelText('Amount'), '1.239');
    await user.type(screen.getByLabelText('Reason'), 'Long precision');
    await user.click(screen.getByRole('button', { name: 'Create Item' }));

    await waitFor(() => {
      expect(mockCreateMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({ amount: '1.24' }),
      );
    });
  });

  it('carries cents into the whole part when rounding pushes 99 → 100', async () => {
    const user = userEvent.setup();

    renderDialog();

    await user.clear(screen.getByLabelText('Amount'));
    await user.type(screen.getByLabelText('Amount'), '0.999');
    await user.type(screen.getByLabelText('Reason'), 'Round up');
    await user.click(screen.getByRole('button', { name: 'Create Item' }));

    await waitFor(() => {
      expect(mockCreateMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({ amount: '1.00' }),
      );
    });
  });
});
