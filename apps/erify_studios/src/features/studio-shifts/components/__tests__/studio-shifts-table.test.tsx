import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { StudioShiftsTable } from '../studio-shifts-table';

import type { StudioShiftsResponse } from '@/features/studio-shifts/api/studio-shifts.types';

const mockDeleteMutateAsync = vi.fn();
const mockUpdateSearch = vi.fn();

const mockUseStudioShifts = vi.fn();

vi.mock('@/features/studio-shifts/hooks/use-studio-member-map', () => ({
  useStudioMemberMap: () => ({ memberMap: {} }),
}));

vi.mock('@/features/memberships/api/get-studio-memberships', () => ({
  useStudioMembershipsQuery: () => ({ data: { data: [] }, isLoading: false }),
}));

vi.mock('@/features/studio-shifts/hooks/use-studio-shifts', () => ({
  useStudioShifts: (...args: unknown[]) => mockUseStudioShifts(...args),
}));

vi.mock('@/features/studio-shifts/api/create-studio-shift', () => ({
  useCreateStudioShift: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

vi.mock('@/features/studio-shifts/api/update-studio-shift', () => ({
  useUpdateStudioShift: () => ({ mutateAsync: vi.fn(), isPending: false }),
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

vi.mock('@/features/studio-shifts/components/shift-roster-card', () => ({
  ShiftRosterCard: ({
    shifts,
    onDelete,
    onLimitChange,
  }: {
    shifts: Array<{ id: string }>;
    onDelete: (shiftId: string) => void;
    onLimitChange: (limit: number) => void;
  }) => (
    <div>
      <p data-testid="shift-order">{shifts.map((shift) => shift.id).join(',')}</p>
      <button type="button" onClick={() => onDelete('ssh_1')}>
        delete-ssh-1
      </button>
      <button type="button" onClick={() => onLimitChange(25)}>
        limit-25
      </button>
    </div>
  ),
}));

vi.mock('@/features/studio-shifts/components/studio-shift-form-dialog', () => ({
  StudioShiftFormDialog: ({
    idPrefix,
    open,
  }: {
    idPrefix: string;
    open: boolean;
  }) => (
    <p data-testid={`dialog-${idPrefix}`}>
      {open ? 'open' : 'closed'}
    </p>
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

    mockUseStudioShifts.mockReturnValue({
      data: {
        data: [],
        meta: { page: 1, limit: 10, total: 0, totalPages: 1 },
      } satisfies StudioShiftsResponse,
      isLoading: false,
      isFetching: false,
      refetch: vi.fn(),
    });
  });

  it('sorts shifts by first block start before rendering roster', () => {
    mockUseStudioShifts.mockReturnValue({
      data: {
        data: [
          createShift('ssh_late', '2026-03-05T11:00:00.000Z'),
          createShift('ssh_early', '2026-03-05T09:00:00.000Z'),
        ],
        meta: { page: 1, limit: 10, total: 2, totalPages: 1 },
      } satisfies StudioShiftsResponse,
      isLoading: false,
      isFetching: false,
      refetch: vi.fn(),
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
    mockUseStudioShifts.mockReturnValue({
      data: {
        data: [createShift('ssh_1', '2026-03-05T09:00:00.000Z')],
        meta: { page: 1, limit: 10, total: 1, totalPages: 1 },
      } satisfies StudioShiftsResponse,
      isLoading: false,
      isFetching: false,
      refetch: vi.fn(),
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

  it('opens create dialog and updates limit via roster action', async () => {
    const user = userEvent.setup();

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

    await user.click(screen.getByRole('button', { name: 'limit-25' }));

    expect(mockUpdateSearch).toHaveBeenCalled();
  });

  it('does not snap back to page 1 while the next page metadata is still loading', () => {
    mockUseStudioShifts.mockReturnValue({
      data: undefined,
      isLoading: false,
      isFetching: true,
      refetch: vi.fn(),
    });

    render(
      <StudioShiftsTable
        studioId="std_1"
        isStudioAdmin
        search={{ view: 'table', page: 2, limit: 50 }}
        updateSearch={mockUpdateSearch}
      />,
    );

    expect(mockUpdateSearch).not.toHaveBeenCalled();
  });

  it('corrects the page only after the API reports a lower total page count', () => {
    mockUseStudioShifts.mockReturnValue({
      data: {
        data: [],
        meta: { page: 2, limit: 50, total: 53, totalPages: 1 },
      } satisfies StudioShiftsResponse,
      isLoading: false,
      isFetching: false,
      refetch: vi.fn(),
    });

    render(
      <StudioShiftsTable
        studioId="std_1"
        isStudioAdmin
        search={{ view: 'table', page: 2, limit: 50 }}
        updateSearch={mockUpdateSearch}
      />,
    );

    expect(mockUpdateSearch).toHaveBeenCalledWith(expect.any(Function));
  });
});
