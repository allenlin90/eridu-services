import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import type { StudioShow } from '../../api/get-studio-shows';
import { ShowActualsDialog } from '../show-actuals-dialog';

const mutateAsync = vi.fn();

vi.mock('../../api/update-studio-show', () => ({
  useUpdateStudioShow: () => ({
    mutateAsync,
    isPending: false,
  }),
}));

vi.mock('@eridu/ui', async () => {
  return {
    Button: ({ children, onClick, disabled, type = 'button', ...rest }: any) => (
      <button type={type} onClick={onClick} disabled={disabled} {...rest}>
        {children}
      </button>
    ),
    Dialog: ({ open, children }: any) => (open ? <div role="dialog">{children}</div> : null),
    DialogContent: ({ children }: any) => <div>{children}</div>,
    DialogHeader: ({ children }: any) => <div>{children}</div>,
    DialogTitle: ({ children }: any) => <h2>{children}</h2>,
    DialogDescription: ({ children }: any) => <p>{children}</p>,
    DialogFooter: ({ children }: any) => <div>{children}</div>,
    Label: ({ children }: any) => <label>{children}</label>,
    ResponsiveDateTimePicker: ({ value, onChange, label }: any) => (
      <input
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    ),
  };
});

function makeShow(overrides: Partial<StudioShow> = {}): StudioShow {
  return {
    id: 'show_1',
    name: 'Morning Launch',
    client_id: 'client_1',
    client_name: 'Acme',
    schedule_id: null,
    schedule_name: null,
    studio_id: 'std_1',
    studio_name: 'Studio One',
    studio_room_id: null,
    studio_room_name: null,
    show_type_id: 'st_1',
    show_type_name: 'Live',
    show_status_id: 'ss_1',
    show_status_name: 'Scheduled',
    show_status_system_key: null,
    show_standard_id: 'std_id',
    show_standard_name: 'Premium',
    start_time: '2026-04-01T09:00:00.000Z',
    end_time: '2026-04-01T10:00:00.000Z',
    actual_start_time: null,
    actual_end_time: null,
    metadata: {},
    created_at: '2026-04-01T00:00:00.000Z',
    updated_at: '2026-04-01T00:00:00.000Z',
    creators: [],
    platforms: [],
    task_summary: { total: 0, assigned: 0, unassigned: 0, completed: 0 },
    ...overrides,
  } as StudioShow;
}

describe('showActualsDialog', () => {
  beforeEach(() => {
    mutateAsync.mockReset();
    mutateAsync.mockResolvedValue(undefined);
  });

  it('saves the entered actuals via mutateAsync and closes', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    const onSaved = vi.fn();

    render(
      <ShowActualsDialog
        open
        onOpenChange={onOpenChange}
        studioId="std_1"
        show={makeShow()}
        onSaved={onSaved}
      />,
    );

    const startInput = screen.getByLabelText('Actual start') as HTMLInputElement;
    const endInput = screen.getByLabelText('Actual end') as HTMLInputElement;
    await user.type(startInput, '2026-04-01T09:05:00.000Z');
    await user.type(endInput, '2026-04-01T10:03:00.000Z');

    await user.click(screen.getByRole('button', { name: 'Save actuals' }));

    await waitFor(() => {
      expect(mutateAsync).toHaveBeenCalledWith({
        showId: 'show_1',
        data: {
          actual_start_time: '2026-04-01T09:05:00.000Z',
          actual_end_time: '2026-04-01T10:03:00.000Z',
        },
      });
    });
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(onSaved).toHaveBeenCalled();
  });

  it('disables Save and shows an error when end is at or before start', async () => {
    const user = userEvent.setup();

    render(
      <ShowActualsDialog
        open
        onOpenChange={vi.fn()}
        studioId="std_1"
        show={makeShow({
          actual_start_time: '2026-04-01T10:00:00.000Z',
          actual_end_time: '2026-04-01T09:00:00.000Z',
        })}
      />,
    );

    expect(screen.getByText('Actual end time must be after actual start time.')).toBeInTheDocument();
    const save = screen.getByRole('button', { name: 'Save actuals' });
    expect(save).toBeDisabled();
    await user.click(save);
    expect(mutateAsync).not.toHaveBeenCalled();
  });

  it('sends nulls when both fields are cleared', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();

    render(
      <ShowActualsDialog
        open
        onOpenChange={onOpenChange}
        studioId="std_1"
        show={makeShow({
          actual_start_time: '2026-04-01T09:00:00.000Z',
          actual_end_time: '2026-04-01T10:00:00.000Z',
        })}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Clear actuals' }));
    await user.click(screen.getByRole('button', { name: 'Save actuals' }));

    await waitFor(() => {
      expect(mutateAsync).toHaveBeenCalledWith({
        showId: 'show_1',
        data: {
          actual_start_time: null,
          actual_end_time: null,
        },
      });
    });
  });
});
