import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { CurrentDutyManagerCard } from '../current-duty-manager-card';

describe('currentDutyManagerCard', () => {
  it('renders loading state', () => {
    render(<CurrentDutyManagerCard isLoading dutyManager={null} />);

    expect(screen.getByText('Loading current duty manager...')).toBeInTheDocument();
  });

  it('renders no-active-duty-manager state', () => {
    render(<CurrentDutyManagerCard isLoading={false} dutyManager={null} />);

    expect(screen.getByText('No active duty manager.')).toBeInTheDocument();
  });

  it('renders active duty manager details with fallback email', () => {
    render(
      <CurrentDutyManagerCard
        isLoading={false}
        dutyManager={{
          id: 'ssh_1',
          studio_id: 'std_1',
          user_id: 'user_1',
          date: '2026-03-05',
          hourly_rate: '20.00',
          projected_cost: '60.00',
          calculated_cost: null,
          is_approved: false,
          is_duty_manager: true,
          status: 'SCHEDULED',
          metadata: {},
          blocks: [],
          created_at: '2026-03-05T00:00:00.000Z',
          updated_at: '2026-03-05T00:00:00.000Z',
        }}
        memberName="Alice"
        shiftLabel="09:00 - 12:00"
        dateLabel="Mar 5, 2026"
      />,
    );

    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Member details unavailable')).toBeInTheDocument();
    expect(screen.getByText('Mar 5, 2026 | 09:00 - 12:00')).toBeInTheDocument();
    expect(screen.getByText('On Duty')).toBeInTheDocument();
  });
});
