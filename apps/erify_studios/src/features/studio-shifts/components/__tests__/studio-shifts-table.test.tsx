import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { StudioShiftsTable } from '../studio-shifts-table';

import type { ShiftFormState } from '@/features/studio-shifts/types/shift-form.types';

const mockDeleteMutateAsync = vi.fn();
const mockUpdateMutateAsync = vi.fn();
const mockUpdateSearch = vi.fn();
const mockUseStudioShiftsPageController = vi.fn();

vi.mock('@/features/studio-shifts/hooks/use-studio-member-map', () => ({
  useStudioMemberMap: () => ({ memberMap: {} }),
}));

vi.mock('@/features/memberships/api/get-studio-memberships', () => ({
  useStudioMembershipsQuery: () => ({ data: { data: [] }, isLoading: false }),
}));

vi.mock('@/features/studio-shifts/hooks/use-studio-shifts-page-controller', () => ({
  useStudioShiftsPageController: (...args: unknown[]) => mockUseStudioShiftsPageController(...args),
}));

vi.mock('@/features/studio-shifts/api/create-studio-shift', () => ({
  useCreateStudioShift: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

vi.mock('@/features/studio-shifts/api/update-studio-shift', () => ({
  useUpdateStudioShift: () => ({ mutateAsync: mockUpdateMutateAsync, isPending: false }),
}));

vi.mock('@/features/studio-shifts/api/assign-duty-manager', () => ({
  useAssignDutyManager: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

vi.mock('@/features/studio-shifts/api/delete-studio-shift', () => ({
  useDeleteStudioShift: () => ({ mutateAsync: mockDeleteMutateAsync, isPending: false }),
}));

vi.mock('@/features/admin/components', () => ({
  DeleteConfirmDialog: ({
    open,
    onConfirm,
  }: {
    open: boolean;
    onConfirm: () => void;
  }) => (
    <div>
      <p data-testid="delete-dialog">{open ? 'open' : 'closed'}</p>
      {open && (
        <button type="button" onClick={onConfirm}>
          confirm-delete
        </button>
      )}
    </div>
  ),
}));

vi.mock('@/features/studio-shifts/components/shift-toolbar', () => ({
  ShiftToolbar: ({ onCreateClick }: { onCreateClick: () => void }) => (
    <button type="button" onClick={onCreateClick}>
      open-create
    </button>
  ),
}));

vi.mock('@/features/studio-shifts/components/shift-compensation-dialog', () => ({
  ShiftCompensationDialog: ({ open }: { open: boolean }) => (
    <p data-testid="compensation-dialog">{open ? 'open' : 'closed'}</p>
  ),
}));

vi.mock('@/features/studio-shifts/components/shift-roster-card', () => ({
  ShiftRosterCard: ({
    shifts,
    onEdit,
    onDelete,
    onPaginationChange,
  }: {
    shifts: Array<{ id: string }>;
    onEdit: (shift: unknown) => void;
    onDelete: (shiftId: string) => void;
    onPaginationChange: (pagination: { pageIndex: number; pageSize: number }) => void;
  }) => (
    <div>
      <p data-testid="shift-order">{shifts.map((shift) => shift.id).join(',')}</p>
      {shifts[0] && (
        <button type="button" onClick={() => onEdit(shifts[0])}>
          edit-first-shift
        </button>
      )}
      <button type="button" onClick={() => onDelete('ssh_1')}>
        delete-ssh-1
      </button>
      <button type="button" onClick={() => onPaginationChange({ pageIndex: 0, pageSize: 20 })}>
        pagination-change
      </button>
    </div>
  ),
}));

vi.mock('@/features/studio-shifts/components/studio-shift-form-dialog', () => ({
  StudioShiftFormDialog: ({
    idPrefix,
    open,
    formState,
    onFormChange,
    onSubmit,
  }: {
    idPrefix: string;
    open: boolean;
    formState: ShiftFormState;
    onFormChange: (next: ShiftFormState) => void;
    onSubmit: () => void;
  }) => (
    <div>
      <p data-testid={`dialog-${idPrefix}`}>
        {open ? 'open' : 'closed'}
      </p>
      {open && idPrefix === 'edit' && (
        <div>
          <button
            type="button"
            onClick={() => onFormChange({ ...formState, hourlyRate: '25.00' })}
          >
            set-hourly-rate-25
          </button>
          <button
            type="button"
            onClick={() => onFormChange({ ...formState, hourlyRate: '20' })}
          >
            set-hourly-rate-20
          </button>
          <button type="button" onClick={onSubmit}>
            submit-edit
          </button>
        </div>
      )}
    </div>
  ),
}));

function createShift(id: string, startIso: string) {
  return {
    id,
    studio_id: 'std_1',
    user_id: 'user_1',
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
        id: `${id}_block`,
        start_time: startIso,
        end_time: '2026-03-05T12:00:00.000Z',
        metadata: {},
        created_at: '2026-03-05T00:00:00.000Z',
        updated_at: '2026-03-05T00:00:00.000Z',
      },
    ],
    created_at: '2026-03-05T00:00:00.000Z',
    updated_at: '2026-03-05T00:00:00.000Z',
  };
}

describe('studioShiftsTable', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpdateMutateAsync.mockResolvedValue(undefined);

    mockUseStudioShiftsPageController.mockReturnValue({
      data: undefined,
      shifts: [],
      isLoading: false,
      isFetching: false,
      refetch: vi.fn(),
      pagination: { pageIndex: 0, pageSize: 10, total: 0, pageCount: 0 },
      onPaginationChange: vi.fn(),
    });
  });

  it('renders shifts from the page controller', () => {
    mockUseStudioShiftsPageController.mockReturnValue({
      data: undefined,
      shifts: [
        createShift('ssh_early', '2026-03-05T09:00:00.000Z'),
        createShift('ssh_late', '2026-03-05T11:00:00.000Z'),
      ],
      isLoading: false,
      isFetching: false,
      refetch: vi.fn(),
      pagination: { pageIndex: 0, pageSize: 10, total: 2, pageCount: 1 },
      onPaginationChange: vi.fn(),
    });

    render(
      <StudioShiftsTable
        studioId="std_1"
        isStudioAdmin
        search={{ view: 'table', page: 1, limit: 10 }}
        updateSearch={mockUpdateSearch}
      />,
    );

    expect(screen.getByTestId('shift-order')).toHaveTextContent('ssh_early,ssh_late');
  });

  it('opens delete confirmation dialog before mutation', async () => {
    const user = userEvent.setup();
    mockDeleteMutateAsync.mockResolvedValue(undefined);
    mockUseStudioShiftsPageController.mockReturnValue({
      data: undefined,
      shifts: [createShift('ssh_1', '2026-03-05T09:00:00.000Z')],
      isLoading: false,
      isFetching: false,
      refetch: vi.fn(),
      pagination: { pageIndex: 0, pageSize: 10, total: 1, pageCount: 1 },
      onPaginationChange: vi.fn(),
    });

    render(
      <StudioShiftsTable
        studioId="std_1"
        isStudioAdmin
        search={{ view: 'table', page: 1, limit: 10 }}
        updateSearch={mockUpdateSearch}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'delete-ssh-1' }));

    expect(mockDeleteMutateAsync).not.toHaveBeenCalled();
    expect(screen.getByTestId('delete-dialog')).toHaveTextContent('open');

    await user.click(screen.getByRole('button', { name: 'confirm-delete' }));

    await waitFor(() => {
      expect(mockDeleteMutateAsync).toHaveBeenCalledWith('ssh_1');
    });
  });

  it('opens create dialog and wires pagination changes through the shared handler', async () => {
    const user = userEvent.setup();
    const mockOnPaginationChange = vi.fn();

    mockUseStudioShiftsPageController.mockReturnValue({
      data: undefined,
      shifts: [],
      isLoading: false,
      isFetching: false,
      refetch: vi.fn(),
      pagination: { pageIndex: 0, pageSize: 10, total: 0, pageCount: 0 },
      onPaginationChange: mockOnPaginationChange,
    });

    render(
      <StudioShiftsTable
        studioId="std_1"
        isStudioAdmin
        search={{ view: 'table', page: 1, limit: 10 }}
        updateSearch={mockUpdateSearch}
      />,
    );

    expect(screen.getByTestId('dialog-create')).toHaveTextContent('closed');

    await user.click(screen.getByRole('button', { name: 'open-create' }));
    expect(screen.getByTestId('dialog-create')).toHaveTextContent('open');

    await user.click(screen.getByRole('button', { name: 'pagination-change' }));

    expect(mockOnPaginationChange).toHaveBeenCalledWith({ pageIndex: 0, pageSize: 20 });
  });

  it('warns before submitting a changed hourly-rate snapshot with an override reason', async () => {
    const user = userEvent.setup();
    mockUseStudioShiftsPageController.mockReturnValue({
      data: undefined,
      shifts: [createShift('ssh_1', '2026-03-05T09:00:00.000Z')],
      isLoading: false,
      isFetching: false,
      refetch: vi.fn(),
      pagination: { pageIndex: 0, pageSize: 10, total: 1, pageCount: 1 },
      onPaginationChange: vi.fn(),
    });

    render(
      <StudioShiftsTable
        studioId="std_1"
        isStudioAdmin
        search={{ view: 'table', page: 1, limit: 10 }}
        updateSearch={mockUpdateSearch}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'edit-first-shift' }));
    await user.click(screen.getByRole('button', { name: 'set-hourly-rate-25' }));
    await user.click(screen.getByRole('button', { name: 'submit-edit' }));

    expect(screen.getByText(/Changing hourly rate updates a compensation snapshot/i)).toBeInTheDocument();
    expect(mockUpdateMutateAsync).not.toHaveBeenCalled();

    await user.type(screen.getByLabelText('Override reason'), 'Corrected overtime rate');
    await user.click(screen.getByRole('button', { name: 'Confirm rate change' }));

    await waitFor(() => {
      expect(mockUpdateMutateAsync).toHaveBeenCalledWith({
        shiftId: 'ssh_1',
        payload: expect.objectContaining({
          hourly_rate: 25,
          override_reason: 'Corrected overtime rate',
        }),
      });
    });
  });

  it('skips the hourly-rate warning for equivalent rate values', async () => {
    const user = userEvent.setup();
    mockUseStudioShiftsPageController.mockReturnValue({
      data: undefined,
      shifts: [createShift('ssh_1', '2026-03-05T09:00:00.000Z')],
      isLoading: false,
      isFetching: false,
      refetch: vi.fn(),
      pagination: { pageIndex: 0, pageSize: 10, total: 1, pageCount: 1 },
      onPaginationChange: vi.fn(),
    });

    render(
      <StudioShiftsTable
        studioId="std_1"
        isStudioAdmin
        search={{ view: 'table', page: 1, limit: 10 }}
        updateSearch={mockUpdateSearch}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'edit-first-shift' }));
    await user.click(screen.getByRole('button', { name: 'set-hourly-rate-20' }));
    await user.click(screen.getByRole('button', { name: 'submit-edit' }));

    expect(screen.queryByText(/Changing hourly rate updates a compensation snapshot/i)).not.toBeInTheDocument();
    await waitFor(() => {
      expect(mockUpdateMutateAsync).toHaveBeenCalledWith({
        shiftId: 'ssh_1',
        payload: expect.not.objectContaining({
          override_reason: expect.anything(),
        }),
      });
    });
  });
});
