import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ShiftEditCard } from '../shift-edit-card';

const mockShiftFormFields = vi.fn(() => <div data-testid="mock-shift-form-fields" />);

vi.mock('@/features/studio-shifts/components/shift-form-fields', () => ({
  ShiftFormFields: (props: unknown) => mockShiftFormFields(props),
}));

const shift = {
  id: 'ssh_1',
  studio_id: 'std_1',
  user_id: 'user_1',
  user_name: 'Ava Manager',
  date: '2026-03-05',
  hourly_rate: '20.00',
  planned_cost: '60.00',
  actual_cost: null,
  is_approved: false,
  is_duty_manager: false,
  status: 'SCHEDULED' as const,
  metadata: {},
  blocks: [],
  created_at: '2026-03-05T00:00:00.000Z',
  updated_at: '2026-03-05T00:00:00.000Z',
};

describe('shiftEditCard', () => {
  it('delegates to ShiftFormFields without hourly-rate editing', () => {
    render(
      <ShiftEditCard
        shift={shift}
        memberName="Ava Manager"
        dateLabel="Mar 5, 2026"
        members={[]}
        onMemberSearch={vi.fn()}
        formState={{
          userId: 'user_1',
          date: '2026-03-05',
          blocks: [{ id: 'block_1', startTime: '09:00', endTime: '12:00' }],
          hourlyRate: '20.00',
          isDutyManager: false,
          status: 'SCHEDULED',
        }}
        formError={null}
        isSaving={false}
        onChange={vi.fn()}
        onSave={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    expect(screen.getByTestId('mock-shift-form-fields')).toBeInTheDocument();
    expect(mockShiftFormFields).toHaveBeenCalledWith(
      expect.objectContaining({
        includeStatus: true,
        includeHourlyRate: false,
      }),
    );
  });
});
