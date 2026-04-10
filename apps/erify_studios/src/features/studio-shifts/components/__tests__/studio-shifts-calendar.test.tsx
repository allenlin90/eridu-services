import { render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { StudioShiftsCalendar } from '../studio-shifts-calendar';

const mockUseStudioShifts = vi.fn();
const mockUseMyShifts = vi.fn();

vi.mock('@schedule-x/react', () => ({
  useNextCalendarApp: () => ({
    events: {
      set: vi.fn(),
    },
  }),
}));

vi.mock('@/features/studio-shifts/components/shift-calendar-card', () => ({
  ShiftCalendarCard: () => <div data-testid="shift-calendar-card" />,
}));

vi.mock('@/features/studio-shifts/hooks/use-studio-member-map', () => ({
  useStudioMemberMap: () => ({
    memberMap: new Map(),
  }),
}));

vi.mock('@/features/studio-shifts/hooks/use-studio-shifts', () => ({
  useStudioShifts: (...args: unknown[]) => mockUseStudioShifts(...args),
  useMyShifts: (...args: unknown[]) => mockUseMyShifts(...args),
}));

vi.mock('@/lib/hooks/use-app-debounce', () => ({
  useAppDebounce: <T,>(value: T) => value,
}));

describe('studioShiftsCalendar', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-13T09:00:00.000Z'));

    mockUseStudioShifts.mockReturnValue({
      data: { data: [] },
      isLoading: false,
      isFetching: false,
      refetch: vi.fn(),
    });
    mockUseMyShifts.mockReturnValue({
      data: { data: [] },
      isLoading: false,
      isFetching: false,
      refetch: vi.fn(),
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('queries the visible week on first load for the studio calendar', () => {
    render(<StudioShiftsCalendar studioId="studio-1" />);

    expect(mockUseStudioShifts).toHaveBeenCalledWith(
      'studio-1',
      expect.objectContaining({
        page: 1,
        limit: 70,
        date_from: '2026-03-09',
        date_to: '2026-03-15',
      }),
      { enabled: true },
    );
    expect(mockUseMyShifts).toHaveBeenCalledWith(
      expect.objectContaining({
        page: 1,
        limit: 70,
        date_from: '2026-03-09',
        date_to: '2026-03-15',
      }),
      { enabled: false },
    );
  });
});
