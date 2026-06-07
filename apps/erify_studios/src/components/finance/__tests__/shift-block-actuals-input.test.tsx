import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ShiftBlockActualsInput } from '../shift-block-actuals-input';

vi.mock('@eridu/ui', () => ({
  Button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button type={props.type ?? 'button'} {...props}>{children}</button>
  ),
  ResponsiveDateTimePicker: ({
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
  Label: ({ children, htmlFor }: { children: ReactNode; htmlFor?: string }) => (
    <label htmlFor={htmlFor}>{children}</label>
  ),
}));

const block = {
  id: 'ssb_1',
  start_time: '2026-03-05T09:00:00.000Z',
  end_time: '2026-03-05T12:00:00.000Z',
  actual_start_time: null,
  actual_end_time: null,
  metadata: {},
  created_at: '2026-03-05T00:00:00.000Z',
  updated_at: '2026-03-05T00:00:00.000Z',
};

describe('shiftBlockActualsInput', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('submits a valid actual time pair', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<ShiftBlockActualsInput block={block} onSubmit={onSubmit} />);

    const [startInput, endInput] = screen.getAllByLabelText('datetime-picker');
    await user.type(startInput!, '2026-03-05T09:10:00.000Z');
    await user.type(endInput!, '2026-03-05T12:05:00.000Z');
    await user.click(screen.getByRole('button', { name: 'Save actuals' }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        actual_start_time: '2026-03-05T09:10:00.000Z',
        actual_end_time: '2026-03-05T12:05:00.000Z',
      });
    });
  });

  it('allows clearing one side and clearing both actual timestamps', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(
      <ShiftBlockActualsInput
        block={{
          ...block,
          actual_start_time: '2026-03-05T09:10:00.000Z',
          actual_end_time: '2026-03-05T12:05:00.000Z',
        }}
        onSubmit={onSubmit}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Clear actual start' }));
    await user.click(screen.getByRole('button', { name: 'Save actuals' }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        actual_start_time: null,
        actual_end_time: '2026-03-05T12:05:00.000Z',
      });
    });

    await user.click(screen.getByRole('button', { name: 'Clear actuals' }));
    await user.click(screen.getByRole('button', { name: 'Save actuals' }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenLastCalledWith({
        actual_start_time: null,
        actual_end_time: null,
      });
    });
  });

  it('blocks inverted actual ranges on the client', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<ShiftBlockActualsInput block={block} onSubmit={onSubmit} />);

    const [startInput, endInput] = screen.getAllByLabelText('datetime-picker');
    await user.type(startInput!, '2026-03-05T12:00:00.000Z');
    await user.type(endInput!, '2026-03-05T09:00:00.000Z');

    expect(screen.getByText('Actual end time must be after actual start time.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save actuals' })).toBeDisabled();
  });
});
