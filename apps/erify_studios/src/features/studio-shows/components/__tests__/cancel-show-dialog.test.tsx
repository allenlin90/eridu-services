import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AxiosError, AxiosHeaders } from 'axios';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { StudioShowDetail } from '@eridu/api-types/shows';

import { CancelShowDialog } from '../cancel-show-dialog';

const useCancellationTierMock = vi.hoisted(() => vi.fn());
const mutateMock = vi.hoisted(() => vi.fn());

vi.mock('../../hooks/use-cancellation-tier', () => ({
  useCancellationTier: useCancellationTierMock,
}));
vi.mock('../../api/cancel-studio-show', () => ({
  useCancelShowWithResolution: () => ({ mutate: mutateMock, isPending: false }),
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

function makeShow(): StudioShowDetail {
  return {
    id: 'show_1',
    name: 'Test Show',
    show_status_system_key: 'CONFIRMED',
  } as StudioShowDetail;
}

describe('cancelShowDialog', () => {
  beforeEach(() => {
    mutateMock.mockReset();
  });

  it('disables the show-detail trigger for a Duty Manager tier', () => {
    useCancellationTierMock.mockReturnValue({ tier: 'duty_manager', isLoading: false });

    render(<CancelShowDialog studioId="studio_1" show={makeShow()} />);

    expect(screen.getByRole('button', { name: /cancel show/i })).toBeDisabled();
  });

  it('renders the outcome picker for a Manager tier', async () => {
    useCancellationTierMock.mockReturnValue({ tier: 'manager', isLoading: false });
    const user = userEvent.setup();

    render(<CancelShowDialog studioId="studio_1" show={makeShow()} />);
    await user.click(screen.getByRole('button', { name: /cancel show/i }));

    expect(screen.getByLabelText(/^outcome$/i)).toBeInTheDocument();
  });

  it('disables the trigger when the tier resolves to null', () => {
    useCancellationTierMock.mockReturnValue({ tier: null, isLoading: false });

    render(<CancelShowDialog studioId="studio_1" show={makeShow()} />);

    expect(screen.getByRole('button', { name: /cancel show/i })).toBeDisabled();
  });

  it('submits with an outcome field for Manager tier', async () => {
    useCancellationTierMock.mockReturnValue({ tier: 'manager', isLoading: false });
    const user = userEvent.setup();

    render(<CancelShowDialog studioId="studio_1" show={makeShow()} />);
    await user.click(screen.getByRole('button', { name: /cancel show/i }));
    await user.selectOptions(screen.getByLabelText(/reason category/i), 'EQUIPMENT_FAILURE');
    await user.type(screen.getByLabelText(/^reason$/i), 'Camera failed mid-show');
    await user.selectOptions(screen.getByLabelText(/^outcome$/i), 'CANCELLED');
    await user.click(screen.getByRole('button', { name: /submit/i }));

    expect(mutateMock).toHaveBeenCalledWith({
      showId: 'show_1',
      data: { reason_category: 'EQUIPMENT_FAILURE', reason_note: 'Camera failed mid-show', outcome: 'CANCELLED' },
    }, expect.anything());
  });

  it('renders the active-task count and a link to the show task list on ACTIVE_TASKS_REMAIN', async () => {
    useCancellationTierMock.mockReturnValue({ tier: 'manager', isLoading: false });
    const user = userEvent.setup();
    mutateMock.mockImplementation((_input, options) => {
      options?.onError?.(axiosErrorWith({ message: 'ACTIVE_TASKS_REMAIN:show_1', details: { activeTaskCount: 3 } }));
    });

    render(<CancelShowDialog studioId="studio_1" show={makeShow()} />);
    await user.click(screen.getByRole('button', { name: /cancel show/i }));
    await user.selectOptions(screen.getByLabelText(/reason category/i), 'EQUIPMENT_FAILURE');
    await user.type(screen.getByLabelText(/^reason$/i), 'Camera failed mid-show');
    await user.selectOptions(screen.getByLabelText(/^outcome$/i), 'CANCELLED');
    await user.click(screen.getByRole('button', { name: /submit/i }));

    expect(screen.getByText(/3 active tasks? are still attached/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /view show tasks/i })).toHaveAttribute(
      'href',
      '/studios/$studioId/shows/$showId/tasks',
    );
  });
});
