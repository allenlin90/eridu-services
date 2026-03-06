import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ShiftFormFields } from '../shift-form-fields';

vi.mock('@eridu/ui', () => ({
  AsyncCombobox: ({
    value,
    onChange,
    onSearch,
    options,
  }: {
    value: string;
    onChange: (value: string) => void;
    onSearch: (value: string) => void;
    options: Array<{ value: string; label: string }>;
  }) => (
    <div>
      <input
        aria-label="member-search"
        value={value}
        onChange={(event) => onSearch(event.target.value)}
      />
      <button type="button" onClick={() => onChange(options[0]?.value ?? '')}>
        select-first-member
      </button>
    </div>
  ),
  Badge: ({ children }: { children: ReactNode }) => <span>{children}</span>,
  Button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button type="button" {...props}>
      {children}
    </button>
  ),
  Checkbox: ({
    checked,
    onCheckedChange,
  }: {
    checked: boolean;
    onCheckedChange: (checked: boolean) => void;
  }) => (
    <input
      aria-label="duty-manager-checkbox"
      type="checkbox"
      checked={checked}
      onChange={(event) => onCheckedChange(event.target.checked)}
    />
  ),
  DatePicker: ({
    value,
    onChange,
  }: {
    value: string;
    onChange: (value: string) => void;
  }) => (
    <input
      aria-label="date-picker"
      value={value}
      onChange={(event) => onChange(event.target.value)}
    />
  ),
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} />,
  Label: ({ children, htmlFor }: { children: ReactNode; htmlFor?: string }) => (
    <label htmlFor={htmlFor}>{children}</label>
  ),
  Select: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SelectContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SelectTrigger: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SelectValue: () => <span />,
}));

describe('shiftFormFields', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(globalThis.crypto, 'randomUUID').mockReturnValue('block_new');
  });

  it('shows inline date-required error when block preview cannot resolve', () => {
    render(
      <ShiftFormFields
        idPrefix="create"
        members={[]}
        onMemberSearch={vi.fn()}
        formState={{
          userId: '',
          date: '',
          blocks: [{ id: 'block_1', startTime: '09:00', endTime: '12:00' }],
          hourlyRate: '',
          isDutyManager: false,
        }}
        onChange={vi.fn()}
      />,
    );

    expect(screen.getByText('Date is required to resolve block windows.')).toBeInTheDocument();
  });

  it('adds new block with previous end time as default start', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(
      <ShiftFormFields
        idPrefix="create"
        members={[]}
        onMemberSearch={vi.fn()}
        formState={{
          userId: '',
          date: '2026-03-05',
          blocks: [{ id: 'block_1', startTime: '09:00', endTime: '12:00' }],
          hourlyRate: '',
          isDutyManager: false,
        }}
        onChange={onChange}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Add Block' }));

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        blocks: expect.arrayContaining([
          expect.objectContaining({
            id: 'block_new',
            startTime: '12:00',
            endTime: '13:00',
          }),
        ]),
      }),
    );
  });

  it('shows +1 day badge for overnight block', () => {
    render(
      <ShiftFormFields
        idPrefix="create"
        members={[]}
        onMemberSearch={vi.fn()}
        formState={{
          userId: '',
          date: '2026-03-05',
          blocks: [{ id: 'block_1', startTime: '23:00', endTime: '01:00' }],
          hourlyRate: '',
          isDutyManager: false,
        }}
        onChange={vi.fn()}
      />,
    );

    expect(screen.getByText('+1 day')).toBeInTheDocument();
  });
});
