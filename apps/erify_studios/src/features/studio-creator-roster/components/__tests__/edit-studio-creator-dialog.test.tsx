import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { StudioCreatorRosterItem } from '@eridu/api-types/studio-creators';

import { EditStudioCreatorDialog } from '../edit-studio-creator-dialog';

const mockInvalidateQueries = vi.fn();
const mockUseUpdateStudioCreatorRoster = vi.fn();

vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({
    invalidateQueries: mockInvalidateQueries,
  }),
}));

vi.mock('@eridu/ui', () => ({
  Button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button type={props.type ?? 'button'} {...props}>{children}</button>
  ),
  Dialog: ({ open, children }: { open: boolean; children: ReactNode }) => (open ? <div>{children}</div> : null),
  DialogContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogDescription: ({ children }: { children: ReactNode }) => <p>{children}</p>,
  DialogFooter: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: ReactNode }) => <h2>{children}</h2>,
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} />,
  Label: ({ children, htmlFor }: { children: ReactNode; htmlFor?: string }) => (
    <label htmlFor={htmlFor}>{children}</label>
  ),
  Select: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SelectContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SelectTrigger: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SelectValue: ({ placeholder }: { placeholder?: string }) => <span>{placeholder}</span>,
}));

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

vi.mock('@/features/studio-show-creators/api/get-creator-availability', () => ({
  creatorAvailabilityKeys: {
    listPrefix: (studioId: string) => ['creator-availability', studioId],
  },
}));

vi.mock('@/features/studio-show-creators/api/get-creator-catalog', () => ({
  creatorCatalogKeys: {
    listPrefix: (studioId: string) => ['creator-catalog', studioId],
  },
}));

vi.mock('../../api/studio-creator-roster', () => ({
  studioCreatorRosterKeys: {
    listPrefix: (studioId: string) => ['studio-creator-roster', studioId],
  },
  useUpdateStudioCreatorRoster: (...args: unknown[]) => mockUseUpdateStudioCreatorRoster(...args),
}));

function createCreator(overrides: Partial<StudioCreatorRosterItem> = {}): StudioCreatorRosterItem {
  return {
    id: 'stcr_123',
    creator_id: 'creator_123',
    creator_name: 'Alice Creator',
    creator_alias_name: 'Alice',
    default_rate: '100.00',
    default_rate_type: 'FIXED',
    default_commission_rate: null,
    is_active: true,
    version: 1,
    metadata: {},
    created_at: '2026-03-27T00:00:00.000Z',
    updated_at: '2026-03-27T00:00:00.000Z',
    ...overrides,
  };
}

describe('editStudioCreatorDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockUseUpdateStudioCreatorRoster.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    });
  });

  it('warns that creator roster default edits do not rewrite show assignment snapshots', () => {
    render(
      <EditStudioCreatorDialog
        studioId="std_1"
        creator={createCreator()}
        open
        onOpenChange={vi.fn()}
      />,
    );

    expect(
      screen.getByText(
        'Roster edits update defaults for future show assignments only. Existing show assignments keep their saved compensation snapshot; edit assignment compensation to change a show.',
      ),
    ).toBeInTheDocument();
  });
});
