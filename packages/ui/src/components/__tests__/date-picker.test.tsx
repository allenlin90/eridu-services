import '@testing-library/jest-dom/vitest';

import { fireEvent, render, screen, within } from '@testing-library/react';
import * as React from 'react';
import { describe, expect, it, vi } from 'vitest';

import { DateTimePicker } from '../date-picker';

vi.mock('../ui/button', () => ({
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
}));

vi.mock('../ui/calendar', () => ({
  Calendar: () => <div data-testid="calendar" />,
}));

vi.mock('../ui/input', () => ({
  Input: (props: any) => <input {...props} />,
}));

vi.mock('../ui/label', () => ({
  Label: ({ children, ...props }: any) => <label {...props}>{children}</label>,
}));

vi.mock('../ui/popover', () => ({
  Popover: ({ children }: any) => <div data-testid="popover">{children}</div>,
  PopoverContent: ({ children }: any) => <div data-testid="popover-content">{children}</div>,
  PopoverTrigger: ({ children }: any) => <div data-testid="popover-trigger">{children}</div>,
}));

vi.mock('../lib/utils', () => ({
  cn: (...args: Array<string | false | null | undefined>) => args.filter(Boolean).join(' '),
}));

vi.mock('lucide-react', () => ({
  CalendarIcon: () => <span data-testid="calendar-icon" />,
}));

describe('dateTimePicker', () => {
  it('syncs the time input when the controlled value changes', () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <DateTimePicker value="2024-01-01T10:00:00" onChange={onChange} />,
    );

    expect(screen.getByDisplayValue('10:00')).toBeInTheDocument();

    rerender(<DateTimePicker value="2024-01-02T15:30:00" onChange={onChange} />);

    expect(screen.getByDisplayValue('15:30')).toBeInTheDocument();
  });

  it('uses non-submit buttons for the trigger and quick actions', () => {
    const view = render(<DateTimePicker value="2024-01-01T10:00:00" onChange={vi.fn()} />);
    const scoped = within(view.container);

    expect(scoped.getByRole('button', { name: /january 1st, 2024 10:00 am/i })).toHaveAttribute('type', 'button');
    expect(scoped.getByRole('button', { name: 'Now' })).toHaveAttribute('type', 'button');
  });

  it('clears hidden seconds and milliseconds when editing the time', () => {
    const onChange = vi.fn();
    const view = render(<DateTimePicker value="2024-01-01T10:00:37.123" onChange={onChange} />);
    const scoped = within(view.container);

    fireEvent.change(scoped.getByDisplayValue('10:00'), {
      target: { value: '11:45' },
    });

    const nextValue = new Date(onChange.mock.calls.at(-1)?.[0]);
    expect(nextValue.getHours()).toBe(11);
    expect(nextValue.getMinutes()).toBe(45);
    expect(nextValue.getSeconds()).toBe(0);
    expect(nextValue.getMilliseconds()).toBe(0);
  });
});
