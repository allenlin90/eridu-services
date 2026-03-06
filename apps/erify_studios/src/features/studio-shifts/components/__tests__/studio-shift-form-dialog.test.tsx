import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { StudioShiftFormDialog } from '../studio-shift-form-dialog';

const mockShiftFormFields = vi.fn(() => <div data-testid="mock-shift-form-fields" />);

vi.mock('@/features/studio-shifts/components/shift-form-fields', () => ({
  ShiftFormFields: (props: unknown) => mockShiftFormFields(props),
}));

describe('studioShiftFormDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders dialog content and delegates props to shift form fields', () => {
    render(
      <StudioShiftFormDialog
        open
        title="Create Shift"
        description="Schedule a shift."
        idPrefix="create"
        members={[]}
        onMemberSearch={vi.fn()}
        isLoadingMembers={false}
        formState={{
          userId: '',
          date: '',
          blocks: [{ id: 'block_1', startTime: '09:00', endTime: '12:00' }],
          hourlyRate: '',
          isDutyManager: false,
        }}
        onFormChange={vi.fn()}
        includeStatus
        formError="Form has errors"
        isSubmitting={false}
        submitLabel="Create Shift"
        onSubmit={vi.fn()}
        onOpenChange={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    expect(screen.getByRole('heading', { name: 'Create Shift' })).toBeInTheDocument();
    expect(screen.getByText('Schedule a shift.')).toBeInTheDocument();
    expect(screen.getByText('Form has errors')).toBeInTheDocument();
    expect(screen.getByTestId('mock-shift-form-fields')).toBeInTheDocument();

    expect(mockShiftFormFields).toHaveBeenCalledWith(
      expect.objectContaining({
        idPrefix: 'create',
        includeStatus: true,
      }),
    );
  });

  it('calls submit and cancel handlers', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    const onCancel = vi.fn();

    render(
      <StudioShiftFormDialog
        open
        title="Edit Shift"
        description="Update shift."
        idPrefix="edit"
        members={[]}
        onMemberSearch={vi.fn()}
        isLoadingMembers={false}
        formState={{
          userId: '',
          date: '',
          blocks: [{ id: 'block_1', startTime: '09:00', endTime: '12:00' }],
          hourlyRate: '',
          isDutyManager: false,
        }}
        onFormChange={vi.fn()}
        formError={null}
        isSubmitting={false}
        submitLabel="Save Changes"
        onSubmit={onSubmit}
        onOpenChange={vi.fn()}
        onCancel={onCancel}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Save Changes' }));
    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('disables actions while submitting', () => {
    render(
      <StudioShiftFormDialog
        open
        title="Edit Shift"
        description="Update shift."
        idPrefix="edit"
        members={[]}
        onMemberSearch={vi.fn()}
        isLoadingMembers={false}
        formState={{
          userId: '',
          date: '',
          blocks: [{ id: 'block_1', startTime: '09:00', endTime: '12:00' }],
          hourlyRate: '',
          isDutyManager: false,
        }}
        onFormChange={vi.fn()}
        formError={null}
        isSubmitting
        submitLabel="Save Changes"
        onSubmit={vi.fn()}
        onOpenChange={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: 'Save Changes' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
  });
});
