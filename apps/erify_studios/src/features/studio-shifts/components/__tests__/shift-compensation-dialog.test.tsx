import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ShiftCompensationDialog } from '../shift-compensation-dialog';

const mockUseStudioCompensationLineItems = vi.fn();
const mockCreateLineItem = vi.fn();
const mockUpdateBlockActuals = vi.fn();

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
    mutateAsync: vi.fn(),
    isPending: false,
  }),
  useDeleteStudioCompensationLineItem: () => ({
    mutate: vi.fn(),
    isPending: false,
  }),
}));

vi.mock('@/features/studio-shifts/api/update-studio-shift-block', () => ({
  useUpdateStudioShiftBlock: () => ({
    mutateAsync: mockUpdateBlockActuals,
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
  projected_cost: '60.00',
  calculated_cost: null,
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
    mockUpdateBlockActuals.mockResolvedValue({});
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
});
