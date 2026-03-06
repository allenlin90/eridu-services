import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ShiftCalendarCard } from '../shift-calendar-card';

vi.mock('@schedule-x/react', () => ({
  ScheduleXCalendar: () => <div data-testid="mock-schedule-x-calendar">Calendar</div>,
}));

describe('shiftCalendarCard', () => {
  it('renders range summary and fetching indicator', () => {
    render(
      <ShiftCalendarCard
        isLoading={false}
        isFetching
        shiftCount={2}
        calendarApp={{} as never}
        dateRange={{ date_from: '2026-03-05', date_to: '2026-03-12' }}
      />,
    );

    expect(screen.getByText('Range: 2026-03-05 to 2026-03-12 | 2 blocks')).toBeInTheDocument();
    expect(screen.getByText('Updating')).toBeInTheDocument();
  });

  it('renders loading skeleton when calendar app is not ready', () => {
    render(
      <ShiftCalendarCard
        isLoading
        isFetching={false}
        shiftCount={0}
        calendarApp={null}
        dateRange={null}
      />,
    );

    expect(screen.getByText('Loading shift calendar...')).toBeInTheDocument();
    expect(screen.getByText('Range: loading calendar window... | 0 blocks')).toBeInTheDocument();
    expect(screen.queryByTestId('mock-schedule-x-calendar')).not.toBeInTheDocument();
  });

  it('renders calendar and empty-range helper when no blocks exist', () => {
    render(
      <ShiftCalendarCard
        isLoading={false}
        isFetching={false}
        shiftCount={0}
        calendarApp={{} as never}
        dateRange={{ date_from: '2026-03-05', date_to: '2026-03-12' }}
      />,
    );

    expect(screen.getByTestId('mock-schedule-x-calendar')).toBeInTheDocument();
    expect(screen.getByText('No shifts in the current range.')).toBeInTheDocument();
  });
});
