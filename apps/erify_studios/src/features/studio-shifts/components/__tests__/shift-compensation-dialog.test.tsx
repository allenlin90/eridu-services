import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ShiftCompensationDialog } from '../shift-compensation-dialog';

const mockUseStudioCompensationLineItems = vi.fn();
const mockCreateLineItem = vi.fn();
const mockUpdateLineItem = vi.fn();
const mockDeleteLineItem = vi.fn();
const mockUpdateBlockActuals = vi.fn();
const mockUpdateShift = vi.fn();

vi.mock('@eridu/ui', () => ({
  Button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button type={props.type ?? 'button'} {...props}>{children}</button>
  ),
  DateTimePicker: ({
    value,
    onChange,
  }: {
    value: string;
    onChange: (value: string) => void;
  }) => (
    <input
      aria-label="datetime-picker"
      value={value}
      onChange={(event) => onChange(event.target.value)}
    />
  ),
  Dialog: ({ open, children }: { open: boolean; children: ReactNode }) => (open ? <div>{children}</div> : null),
  DialogContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogDescription: ({ children }: { children: ReactNode }) => <p>{children}</p>,
  DialogFooter: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: ReactNode }) => <h2>{children}</h2>,
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} />,
  Label: ({ children, htmlFor }: { children: ReactNode; htmlFor?: string }) => (
    <label htmlFor={htmlFor}>{children}</label>
  ),
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

vi.mock('@/features/compensation-line-items/api/compensation-line-items.api', () => ({
  useStudioCompensationLineItems: (...args: unknown[]) => mockUseStudioCompensationLineItems(...args),
}));

vi.mock('@/features/compensation-line-items/hooks/use-compensation-line-item-mutations', () => ({
  useCreateStudioCompensationLineItem: () => ({
    mutateAsync: mockCreateLineItem,
    isPending: false,
  }),
  useUpdateStudioCompensationLineItem: () => ({
    mutateAsync: mockUpdateLineItem,
    isPending: false,
  }),
  useDeleteStudioCompensationLineItem: () => ({
    mutate: mockDeleteLineItem,
    isPending: false,
  }),
}));

vi.mock('@/features/studio-shifts/api/update-studio-shift-block', () => ({
  useUpdateStudioShiftBlock: () => ({
    mutateAsync: mockUpdateBlockActuals,
    isPending: false,
  }),
}));

vi.mock('@/features/studio-shifts/api/update-studio-shift', () => ({
  useUpdateStudioShift: () => ({
    mutateAsync: mockUpdateShift,
    isPending: false,
  }),
}));

const shift = {
  id: 'ssh_1',
  studio_id: 'std_1',
  user_id: 'user_1',
  user_name: 'Alex Manager',
  date: '2026-03-05',
  hourly_rate: '20.00',
  planned_cost: '60.00',
  actual_cost: null,
  is_approved: false,
  is_duty_manager: false,
  status: 'SCHEDULED' as const,
  metadata: {},
  blocks: [
    {
      id: 'ssb_1',
      start_time: '2026-03-05T09:00:00.000Z',
      end_time: '2026-03-05T12:00:00.000Z',
      actual_start_time: null,
      actual_end_time: null,
      metadata: {},
      created_at: '2026-03-05T00:00:00.000Z',
      updated_at: '2026-03-05T00:00:00.000Z',
    },
  ],
  created_at: '2026-03-05T00:00:00.000Z',
  updated_at: '2026-03-05T00:00:00.000Z',
};

describe('shiftCompensationDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseStudioCompensationLineItems.mockReturnValue({
      data: { data: [], meta: { total: 0, page: 1, limit: 100, totalPages: 0 } },
    });
    mockCreateLineItem.mockResolvedValue({});
    mockUpdateLineItem.mockResolvedValue({});
    mockUpdateBlockActuals.mockResolvedValue({});
    mockUpdateShift.mockResolvedValue({});
  });

  it('renders shift and block-scoped panels without a target picker', () => {
    render(
      <ShiftCompensationDialog
        open
        onOpenChange={vi.fn()}
        studioId="std_1"
        shift={shift}
      />,
    );

    expect(screen.getByRole('heading', { name: 'Shift Compensation' })).toBeInTheDocument();
    expect(screen.getByText('Shift adjustments')).toBeInTheDocument();
    expect(screen.getByText('Block 1 adjustments')).toBeInTheDocument();
    expect(screen.queryByLabelText('Target Type')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Target ID')).not.toBeInTheDocument();

    expect(mockUseStudioCompensationLineItems).toHaveBeenCalledWith(
      'std_1',
      expect.objectContaining({ target_type: 'STUDIO_SHIFT', target_id: 'ssh_1' }),
      true,
    );
    expect(mockUseStudioCompensationLineItems).toHaveBeenCalledWith(
      'std_1',
      expect.objectContaining({ target_type: 'STUDIO_SHIFT_BLOCK', target_id: 'ssb_1' }),
      true,
    );
  });

  it('renders planned and actual cost rows; actual is "Pending" when actuals are incomplete', () => {
    render(
      <ShiftCompensationDialog
        open
        onOpenChange={vi.fn()}
        studioId="std_1"
        shift={shift}
      />,
    );

    expect(screen.getByText('Planned')).toBeInTheDocument();
    expect(screen.getByText('$60.00')).toBeInTheDocument();
    expect(screen.getByText('Actual')).toBeInTheDocument();
    expect(screen.getByText('Pending')).toBeInTheDocument();
  });

  it('creates block line items with the block target id', async () => {
    const user = userEvent.setup();
    render(
      <ShiftCompensationDialog
        open
        onOpenChange={vi.fn()}
        studioId="std_1"
        shift={shift}
      />,
    );

    const blockPanel = screen.getByTestId('line-item-panel-STUDIO_SHIFT_BLOCK-ssb_1');
    await user.type(within(blockPanel).getByLabelText('Amount'), '12.345');
    await user.type(within(blockPanel).getByLabelText('Reason'), 'Late handover');
    await user.click(within(blockPanel).getByRole('button', { name: 'Create item' }));

    await waitFor(() => {
      expect(mockCreateLineItem).toHaveBeenCalledWith({
        target_type: 'STUDIO_SHIFT_BLOCK',
        target_id: 'ssb_1',
        amount: '12.35',
        item_type: 'BONUS',
        reason: 'Late handover',
      });
    });
  });

  it('updates block actuals through the block update mutation', async () => {
    const user = userEvent.setup();
    render(
      <ShiftCompensationDialog
        open
        onOpenChange={vi.fn()}
        studioId="std_1"
        shift={shift}
      />,
    );

    const [startInput, endInput] = screen.getAllByLabelText('datetime-picker');
    await user.type(startInput!, '2026-03-05T09:05:00.000Z');
    await user.type(endInput!, '2026-03-05T12:10:00.000Z');
    await user.click(screen.getByRole('button', { name: 'Save actuals' }));

    await waitFor(() => {
      expect(mockUpdateBlockActuals).toHaveBeenCalledWith({
        shiftId: 'ssh_1',
        blockId: 'ssb_1',
        payload: {
          actual_start_time: '2026-03-05T09:05:00.000Z',
          actual_end_time: '2026-03-05T12:10:00.000Z',
        },
      });
    });
  });

  it('edits an existing shift line item via the shift-target panel', async () => {
    const user = userEvent.setup();
    mockUseStudioCompensationLineItems.mockReturnValue({
      data: {
        data: [
          {
            id: 'cli_shift_1',
            studio_id: 'std_1',
            target_type: 'STUDIO_SHIFT',
            target_id: 'ssh_1',
            amount: '15.00',
            item_type: 'BONUS',
            reason: 'Pickup shift',
            metadata: {},
            created_by_id: 'user_1',
            created_at: '2026-03-05T10:00:00.000Z',
            updated_at: '2026-03-05T10:00:00.000Z',
            deleted_at: null,
          },
        ],
        meta: { total: 1, page: 1, limit: 100, totalPages: 1 },
      },
    });

    render(
      <ShiftCompensationDialog
        open
        onOpenChange={vi.fn()}
        studioId="std_1"
        shift={shift}
      />,
    );

    const shiftPanel = screen.getByTestId('line-item-panel-STUDIO_SHIFT-ssh_1');
    await user.click(within(shiftPanel).getByRole('button', { name: 'Edit compensation item Pickup shift' }));

    const amountInput = within(shiftPanel).getByLabelText('Amount');
    await user.clear(amountInput);
    await user.type(amountInput, '22.5');
    await user.click(within(shiftPanel).getByRole('button', { name: 'Update item' }));

    await waitFor(() => {
      expect(mockUpdateLineItem).toHaveBeenCalledWith({
        id: 'cli_shift_1',
        data: {
          amount: '22.50',
          item_type: 'BONUS',
          reason: 'Pickup shift',
        },
      });
    });
  });

  it('deletes an existing block line item via the block-target panel', async () => {
    const user = userEvent.setup();
    mockUseStudioCompensationLineItems.mockImplementation((_studioId: string, params: { target_type: string }) => {
      if (params.target_type === 'STUDIO_SHIFT_BLOCK') {
        return {
          data: {
            data: [
              {
                id: 'cli_block_1',
                studio_id: 'std_1',
                target_type: 'STUDIO_SHIFT_BLOCK',
                target_id: 'ssb_1',
                amount: '-5.00',
                item_type: 'DEDUCTION',
                reason: 'Late by 15min',
                metadata: {},
                created_by_id: 'user_1',
                created_at: '2026-03-05T10:00:00.000Z',
                updated_at: '2026-03-05T10:00:00.000Z',
                deleted_at: null,
              },
            ],
            meta: { total: 1, page: 1, limit: 100, totalPages: 1 },
          },
        };
      }
      return { data: { data: [], meta: { total: 0, page: 1, limit: 100, totalPages: 0 } } };
    });

    render(
      <ShiftCompensationDialog
        open
        onOpenChange={vi.fn()}
        studioId="std_1"
        shift={shift}
      />,
    );

    const blockPanel = screen.getByTestId('line-item-panel-STUDIO_SHIFT_BLOCK-ssb_1');
    await user.click(within(blockPanel).getByRole('button', { name: 'Delete compensation item Late by 15min' }));

    expect(mockDeleteLineItem).toHaveBeenCalledWith('cli_block_1');
  });

  describe('inline rate edit', () => {
    it('shows the stored rate and an Edit button by default; clicking Edit reveals the inputs', async () => {
      const user = userEvent.setup();
      render(
        <ShiftCompensationDialog
          open
          onOpenChange={vi.fn()}
          studioId="std_1"
          shift={shift}
        />,
      );

      const tile = screen.getByTestId('shift-hourly-rate-tile');
      expect(within(tile).queryByLabelText('Hourly rate')).not.toBeInTheDocument();
      await user.click(within(tile).getByRole('button', { name: 'Edit hourly rate' }));

      expect(within(tile).getByLabelText('Hourly rate')).toBeInTheDocument();
      expect(within(tile).getByPlaceholderText('Why is this rate being changed?')).toBeInTheDocument();
      expect(within(tile).getByRole('button', { name: /Save/ })).toBeInTheDocument();
      expect(within(tile).getByRole('button', { name: /Cancel/ })).toBeInTheDocument();
    });

    it('disables Save until a reason is provided when the rate changes', async () => {
      const user = userEvent.setup();
      render(
        <ShiftCompensationDialog
          open
          onOpenChange={vi.fn()}
          studioId="std_1"
          shift={shift}
        />,
      );

      const tile = screen.getByTestId('shift-hourly-rate-tile');
      await user.click(within(tile).getByRole('button', { name: 'Edit hourly rate' }));

      const rateInput = within(tile).getByLabelText('Hourly rate') as HTMLInputElement;
      await user.clear(rateInput);
      await user.type(rateInput, '25.00');

      const saveButton = within(tile).getByRole('button', { name: /Save/ });
      expect(saveButton).toBeDisabled();

      await user.type(within(tile).getByPlaceholderText('Why is this rate being changed?'), 'Manager correction');

      expect(saveButton).not.toBeDisabled();
    });

    it('submits the PATCH with hourly_rate and override_reason when the rate changes', async () => {
      const user = userEvent.setup();
      render(
        <ShiftCompensationDialog
          open
          onOpenChange={vi.fn()}
          studioId="std_1"
          shift={shift}
        />,
      );

      const tile = screen.getByTestId('shift-hourly-rate-tile');
      await user.click(within(tile).getByRole('button', { name: 'Edit hourly rate' }));
      const rateInput = within(tile).getByLabelText('Hourly rate');
      await user.clear(rateInput);
      await user.type(rateInput, '25.50');
      await user.type(within(tile).getByPlaceholderText('Why is this rate being changed?'), 'Manager correction');
      await user.click(within(tile).getByRole('button', { name: /Save/ }));

      await waitFor(() => {
        expect(mockUpdateShift).toHaveBeenCalledWith({
          shiftId: 'ssh_1',
          payload: {
            hourly_rate: 25.5,
            override_reason: 'Manager correction',
          },
        });
      });
    });

    it('does not fire the mutation when the rate is unchanged on Save', async () => {
      const user = userEvent.setup();
      render(
        <ShiftCompensationDialog
          open
          onOpenChange={vi.fn()}
          studioId="std_1"
          shift={shift}
        />,
      );

      const tile = screen.getByTestId('shift-hourly-rate-tile');
      await user.click(within(tile).getByRole('button', { name: 'Edit hourly rate' }));
      // rate is prefilled to the stored 20.00 — typing nothing means no change.
      await user.click(within(tile).getByRole('button', { name: /Save/ }));

      expect(mockUpdateShift).not.toHaveBeenCalled();
      // Editor should close (Edit button visible again).
      expect(within(tile).getByRole('button', { name: 'Edit hourly rate' })).toBeInTheDocument();
    });

    it('surfaces an error inline when the mutation rejects', async () => {
      const user = userEvent.setup();
      mockUpdateShift.mockRejectedValueOnce(new Error('override_reason is required when hourly_rate changes'));

      render(
        <ShiftCompensationDialog
          open
          onOpenChange={vi.fn()}
          studioId="std_1"
          shift={shift}
        />,
      );

      const tile = screen.getByTestId('shift-hourly-rate-tile');
      await user.click(within(tile).getByRole('button', { name: 'Edit hourly rate' }));
      await user.clear(within(tile).getByLabelText('Hourly rate'));
      await user.type(within(tile).getByLabelText('Hourly rate'), '30.00');
      await user.type(within(tile).getByPlaceholderText('Why is this rate being changed?'), 'Pickup shift');
      await user.click(within(tile).getByRole('button', { name: /Save/ }));

      await waitFor(() => {
        expect(within(tile).getByText(/override_reason is required when hourly_rate changes/)).toBeInTheDocument();
      });
      // Editor stays open after an error.
      expect(within(tile).queryByRole('button', { name: 'Edit hourly rate' })).not.toBeInTheDocument();
    });
  });
});
