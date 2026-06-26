import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AxiosError, AxiosHeaders } from 'axios';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { CancellationStatusResponse, StudioShowDetail } from '@eridu/api-types/shows';

import { ResolveCancellationDialog } from '../resolve-cancellation-dialog';

const useCancellationTierMock = vi.hoisted(() => vi.fn());
const resolveMutateMock = vi.hoisted(() => vi.fn());
const amendMutateMock = vi.hoisted(() => vi.fn());

vi.mock('../../hooks/use-cancellation-tier', () => ({
  useCancellationTier: useCancellationTierMock,
}));
vi.mock('../../api/cancel-studio-show', () => ({
  useResolveShowCancellation: () => ({ mutate: resolveMutateMock, isPending: false }),
  useAmendCancellationNote: () => ({ mutate: amendMutateMock, isPending: false }),
  getGateErrorCode: (error: AxiosError) => {
    const message = (error.response?.data as { message?: string } | undefined)?.message;
    return message?.split(':')[0] ?? null;
  },
  getGateActiveTaskCount: (error: AxiosError) =>
    (error.response?.data as { details?: { activeTaskCount?: number } } | undefined)?.details?.activeTaskCount ?? null,
}));
vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to }: { children?: ReactNode; to?: string }) => <a href={to}>{children}</a>,
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
// Same Select-mocking convention as cancel-show-dialog.test.tsx (Task 14) —
// @eridu/ui has no RadioGroup primitive, so the outcome picker uses Select.
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
  };
});

function axiosErrorWith(data: unknown): AxiosError {
  const error = new AxiosError('Request failed');
  error.response = { data, status: 400, statusText: 'Bad Request', headers: {}, config: { headers: new AxiosHeaders() } };
  return error;
}

const show = { id: 'show_1', name: 'Test Show' } as StudioShowDetail;
const pendingStatus: CancellationStatusResponse = {
  is_pending: true,
  gate_kind: 'show_cancellation',
  from_status: 'CONFIRMED',
  reason_category: 'EQUIPMENT_FAILURE',
  reason_note: 'Camera failed',
  opened_by: { uid: 'user_1', name: 'Jane Duty' },
  opened_at: '2026-06-25T16:14:30.201Z',
  allowed_outcomes: ['CANCELLED', 'COMPLETED'],
  history: [],
};

describe('resolveCancellationDialog', () => {
  beforeEach(() => {
    resolveMutateMock.mockReset();
    amendMutateMock.mockReset();
  });

  it('renders nothing when status.is_pending is false', () => {
    useCancellationTierMock.mockReturnValue({ tier: 'manager' });
    const { container } = render(
      <ResolveCancellationDialog studioId="studio_1" show={show} status={{ ...pendingStatus, is_pending: false }} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('renders an outcome option per status.allowed_outcomes, with RESTORE_PREVIOUS labeled "Resume Show"', async () => {
    useCancellationTierMock.mockReturnValue({ tier: 'manager' });
    const user = userEvent.setup();

    render(
      <ResolveCancellationDialog
        studioId="studio_1"
        show={show}
        status={{ ...pendingStatus, allowed_outcomes: ['CANCELLED', 'RESTORE_PREVIOUS'] }}
      />,
    );
    await user.click(screen.getByRole('button', { name: /resolve/i }));

    const outcomeSelect = screen.getByLabelText(/^outcome$/i);
    expect(screen.getByText('Resume Show')).toBeInTheDocument();
    await user.selectOptions(outcomeSelect, 'RESTORE_PREVIOUS');
    expect((outcomeSelect as HTMLSelectElement).value).toBe('RESTORE_PREVIOUS');
  });

  it('does not render the note-amendment field for a Manager tier', async () => {
    useCancellationTierMock.mockReturnValue({ tier: 'manager' });
    const user = userEvent.setup();

    render(<ResolveCancellationDialog studioId="studio_1" show={show} status={pendingStatus} />);
    await user.click(screen.getByRole('button', { name: /resolve/i }));

    expect(screen.queryByLabelText(/update note/i)).not.toBeInTheDocument();
  });

  it('renders the note-amendment field for a Duty Manager tier', async () => {
    useCancellationTierMock.mockReturnValue({ tier: 'duty_manager' });
    const user = userEvent.setup();

    render(<ResolveCancellationDialog studioId="studio_1" show={show} status={pendingStatus} />);
    await user.click(screen.getByRole('button', { name: /resolve/i }));

    expect(screen.getByLabelText(/update note/i)).toBeInTheDocument();
  });

  it('renders the active-task count and a link to the show task list on ACTIVE_TASKS_REMAIN', async () => {
    useCancellationTierMock.mockReturnValue({ tier: 'manager' });
    const user = userEvent.setup();
    resolveMutateMock.mockImplementation((_input, options) => {
      options?.onError?.(axiosErrorWith({ message: 'ACTIVE_TASKS_REMAIN:show_1', details: { activeTaskCount: 3 } }));
    });

    render(<ResolveCancellationDialog studioId="studio_1" show={show} status={pendingStatus} />);
    await user.click(screen.getByRole('button', { name: /resolve/i }));
    await user.selectOptions(screen.getByLabelText(/^outcome$/i), 'CANCELLED');
    await user.type(screen.getByLabelText(/resolution notes/i), 'Confirmed no production happened');
    await user.click(screen.getByRole('button', { name: /confirm/i }));

    expect(screen.getByText(/3 active tasks? are still attached/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /view show tasks/i })).toHaveAttribute(
      'href',
      '/studios/$studioId/shows/$showId/tasks',
    );
  });
});
