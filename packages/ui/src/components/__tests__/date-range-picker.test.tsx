import '@testing-library/jest-dom/vitest';

import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { DatePickerWithRange } from '../ui/date-range-picker';

describe('datePickerWithRange', () => {
  it('supports a unique labelled trigger for forms with multiple ranges', () => {
    render(
      <DatePickerWithRange
        id="show-time-range"
        placeholder="Pick a show time range"
        date={undefined}
        setDate={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: 'Pick a show time range' }))
      .toHaveAttribute('id', 'show-time-range');
    expect(screen.getByRole('button', { name: 'Pick a show time range' }))
      .toHaveAttribute('type', 'button');
  });

  it('shows an end-only range instead of looking unfiltered', () => {
    render(
      <DatePickerWithRange
        date={{ from: undefined, to: new Date(2026, 6, 19) }}
        setDate={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: 'Until Jul 19, 2026' })).toBeInTheDocument();
  });

  it('lets consumers localize an end-only range label', () => {
    render(
      <DatePickerWithRange
        date={{ from: undefined, to: new Date(2026, 6, 19) }}
        setDate={vi.fn()}
        formatEndOnlyLabel={() => 'Through Jul 19, 2026'}
      />,
    );

    expect(screen.getByRole('button', { name: 'Through Jul 19, 2026' })).toBeInTheDocument();
  });
});
