import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DashboardCancellationActions } from '../dashboard-cancellation-actions';

const requestMutateMock = vi.hoisted(() => vi.fn());
const useActiveDutyManagerEligibilityMock = vi.hoisted(() => vi.fn());
const useCancellationStatusMock = vi.hoisted(() => vi.fn());

vi.mock('../../hooks/use-cancellation-tier', () => ({
  useActiveDutyManagerEligibility: useActiveDutyManagerEligibilityMock,
}));
vi.mock('../../api/cancel-studio-show', () => ({
  useRequestCancellationResolution: () => ({ mutate: requestMutateMock, isPending: false }),
  useCancellationStatus: useCancellationStatusMock,
}));
vi.mock('@/components/responsive-dialog', () => ({
  ResponsiveDialog: ({ open, title, children, footer }: any) =>
    open
      ? (
          <div role="dialog">
            <h1>{title}</h1>
            {children}
            {footer}
          </div>
        )
      : null,
}));
vi.mock('@eridu/ui', async () => {
  const actual = await vi.importActual<typeof import('@eridu/ui')>('@eridu/ui');
  return {
    ...actual,
    Select: ({ children, value, onValueChange, 'aria-label': ariaLabel }: any) => (
      <select aria-label={ariaLabel} value={value} onChange={(e) => onValueChange(e.target.value)}>
        {children}
      </select>
    ),
    SelectTrigger: ({ children }: any) => <>{children}</>,
    SelectValue: () => null,
    SelectContent: ({ children }: any) => <>{children}</>,
    SelectItem: ({ children, value }: any) => <option value={value}>{children}</option>,
    DropdownMenuItem: ({ children, disabled, onSelect }: any) => (
      <button type="button" disabled={disabled} onClick={(event) => onSelect?.(event)}>
        {children}
      </button>
    ),
  };
});

function renderActions(canRequestCancellation = true, mayHaveCancellationHistory = true) {
  return render(
    <DashboardCancellationActions
      studioId="studio_1"
      showId="show_1"
      canRequestCancellation={canRequestCancellation}
      mayHaveCancellationHistory={mayHaveCancellationHistory}
      renderTrigger={({ requestItem, historyItem }) => (
        <div>
          {requestItem}
          {historyItem}
        </div>
      )}
    />,
  );
}

describe('dashboardCancellationActions', () => {
  beforeEach(() => {
    requestMutateMock.mockReset();
    useActiveDutyManagerEligibilityMock.mockReturnValue({ isActiveDutyManager: true, isLoading: false });
    useCancellationStatusMock.mockReturnValue({ data: { is_pending: false, history: [] } });
  });

  it('renders a reason-only dashboard request dialog with no outcome picker', async () => {
    const user = userEvent.setup();

    renderActions();
    await user.click(screen.getByRole('button', { name: /request cancellation/i }));

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Request Cancellation' })).toBeInTheDocument();
    expect(screen.getByLabelText(/reason category/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^reason$/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/^outcome$/i)).not.toBeInTheDocument();
  });

  it('uses the deferred cancellation request mutation', async () => {
    const user = userEvent.setup();

    renderActions();
    await user.click(screen.getByRole('button', { name: /request cancellation/i }));
    await user.selectOptions(screen.getByLabelText(/reason category/i), 'EQUIPMENT_FAILURE');
    await user.type(screen.getByLabelText(/^reason$/i), 'Camera failed mid-show');
    await user.click(screen.getByRole('button', { name: /submit/i }));

    expect(requestMutateMock).toHaveBeenCalledWith({
      showId: 'show_1',
      data: {
        reason_category: 'EQUIPMENT_FAILURE',
        reason_note: 'Camera failed mid-show',
      },
    }, expect.anything());
  });

  it('disables the dashboard request action when the user is not active Duty Manager', () => {
    useActiveDutyManagerEligibilityMock.mockReturnValue({ isActiveDutyManager: false, isLoading: false });

    renderActions();

    expect(screen.getByRole('button', { name: /request cancellation/i })).toBeDisabled();
  });

  it('renders cancellation history from dashboard actions', async () => {
    const user = userEvent.setup();
    useCancellationStatusMock.mockReturnValue({
      data: {
        is_pending: false,
        history: [
          {
            event: 'resolved',
            actor: { uid: 'user_1', name: 'Jane Manager' },
            at: '2026-06-25T17:00:00.000Z',
            note: 'Confirmed cancellation',
            outcome: 'CANCELLED',
          },
        ],
      },
    });

    renderActions(false);
    await user.click(screen.getByRole('button', { name: /view cancellation history/i }));

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Cancellation History')).toBeInTheDocument();
    expect(screen.getByText('Jane Manager')).toBeInTheDocument();
    expect(screen.getByText('Confirmed cancellation')).toBeInTheDocument();
  });
});
