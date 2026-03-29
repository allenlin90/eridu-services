import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { STUDIO_ROLE } from '@eridu/api-types/memberships';
import {
  STUDIO_CREATOR_ROSTER_ERROR,
  STUDIO_CREATOR_ROSTER_STATE,
} from '@eridu/api-types/studio-creators';

import { BulkCreatorAssignmentDialog } from '../bulk-creator-assignment-dialog';

const mockUseStudioAccess = vi.fn();
const mockUseCreatorCatalogQuery = vi.fn();
const mockUseBulkAssignCreatorsToShows = vi.fn();

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children }: { children: ReactNode }) => <a>{children}</a>,
}));

vi.mock('@eridu/ui', () => ({
  AsyncMultiCombobox: ({
    onSearch,
    onChange,
    options,
    placeholder,
  }: {
    onSearch: (value: string) => void;
    onChange: (value: string[]) => void;
    options: Array<{ value: string; label: string }>;
    placeholder?: string;
  }) => (
    <div>
      <input placeholder={placeholder} onChange={(event) => onSearch(event.target.value)} />
      <button type="button" onClick={() => onChange(options[0] ? [options[0].value] : [])}>
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

vi.mock('@/lib/hooks/use-studio-access', () => ({
  useStudioAccess: (...args: unknown[]) => mockUseStudioAccess(...args),
}));

vi.mock('@/features/studio-show-creators/api/get-creator-catalog', () => ({
  useCreatorCatalogQuery: (...args: unknown[]) => mockUseCreatorCatalogQuery(...args),
}));

vi.mock('@/features/studio-show-creators/api/bulk-assign-creators-to-shows', () => ({
  useBulkAssignCreatorsToShows: (...args: unknown[]) => mockUseBulkAssignCreatorsToShows(...args),
}));

describe('bulkCreatorAssignmentDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockUseStudioAccess.mockReturnValue({ role: STUDIO_ROLE.ADMIN });

    mockUseCreatorCatalogQuery.mockReturnValue({
      data: [
        {
          id: 'creator_1',
          name: 'Alice',
          alias_name: 'Ali',
          roster_state: STUDIO_CREATOR_ROSTER_STATE.NONE,
        },
      ],
      isLoading: false,
    });

    mockUseBulkAssignCreatorsToShows.mockImplementation(({ onSuccess }: { onSuccess?: (response: any) => void }) => ({
      mutate: vi.fn(() => {
        onSuccess?.({
          created: 0,
          skipped: 0,
          errors: [
            {
              show_id: 'show_1',
              creator_id: 'creator_1',
              reason: STUDIO_CREATOR_ROSTER_ERROR.CREATOR_NOT_IN_ROSTER,
            },
          ],
        });
      }),
      isPending: false,
    }));
  });

  it('keeps the dialog open and renders roster guidance when assignment has errors', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    const onSuccess = vi.fn();

    render(
      <BulkCreatorAssignmentDialog
        studioId="std_1"
        shows={[{ id: 'show_1', name: 'Morning Show' } as any]}
        open
        onOpenChange={onOpenChange}
        onSuccess={onSuccess}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'select-first-creator' }));
    await user.click(screen.getByRole('button', { name: 'Assign Creators' }));

    expect(onOpenChange).not.toHaveBeenCalledWith(false);
    expect(onSuccess).not.toHaveBeenCalled();
    expect(screen.getByText('Some assignments were not completed (1).')).toBeInTheDocument();
    expect(screen.getByText(/Creator is not in this studio roster\. Add them to the roster first\./)).toBeInTheDocument();
    expect(screen.getByText('Onboard missing creators in roster')).toBeInTheDocument();
  });
});
