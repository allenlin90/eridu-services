import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AddCreatorDialog } from '../add-creator-dialog';

const mockUseCreatorAvailabilityQuery = vi.fn();

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children }: { children: ReactNode }) => <a>{children}</a>,
}));

vi.mock('@eridu/ui', () => ({
  AsyncCombobox: ({
    onSearch,
    onChange,
    options,
    placeholder,
  }: {
    onSearch: (value: string) => void;
    onChange: (value: string) => void;
    options: Array<{ value: string; label: string }>;
    placeholder?: string;
  }) => (
    <div>
      <input placeholder={placeholder} onChange={(event) => onSearch(event.target.value)} />
      <button type="button" onClick={() => onChange(options[0] ? options[0].value : '')}>
        select-first-creator
      </button>
    </div>
  ),
  Button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => <button type={props.type ?? 'button'} {...props}>{children}</button>,
  Dialog: ({ open, children }: { open: boolean; children: ReactNode }) => (open ? <div>{children}</div> : null),
  DialogContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogDescription: ({ children }: { children: ReactNode }) => <p>{children}</p>,
  DialogFooter: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: ReactNode }) => <h2>{children}</h2>,
}));

vi.mock('@/features/studio-show-creators/api/get-creator-availability', () => ({
  useCreatorAvailabilityQuery: (...args: unknown[]) => mockUseCreatorAvailabilityQuery(...args),
}));

describe('addCreatorDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseCreatorAvailabilityQuery.mockReturnValue({
      data: [
        {
          id: 'creator_1',
          name: 'Alice',
          alias_name: 'Ali',
          default_rate: '150.00',
          default_rate_type: 'FIXED',
          default_commission_rate: null,
        },
      ],
      isLoading: false,
    });
  });

  it('adds the creator without exposing per-show compensation fields in the assignment dialog', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    render(
      <AddCreatorDialog
        open
        onOpenChange={vi.fn()}
        studioId="std_1"
        isAdmin
        showStartTime="2026-03-20T10:00:00.000Z"
        showEndTime="2026-03-20T12:00:00.000Z"
        isSubmitting={false}
        onSubmit={onSubmit}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'select-first-creator' }));

    expect(screen.queryByLabelText('Agreed Rate')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Commission Rate (%)')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Add Creator' }));

    expect(onSubmit).toHaveBeenCalledWith({ creator_id: 'creator_1' });
  });
});
