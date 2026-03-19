import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { STUDIO_ROLE } from '@eridu/api-types/memberships';

import { StudioSharedFieldsSettings } from '../studio-shared-fields-settings';

const mockUseStudioAccess = vi.fn();

vi.mock('@/lib/hooks/use-studio-access', () => ({
  useStudioAccess: (studioId: string) => mockUseStudioAccess(studioId),
}));

vi.mock('../../hooks/use-studio-shared-fields', () => ({
  useStudioSharedFields: vi.fn(() => ({
    data: {
      shared_fields: [
        {
          key: 'gmv',
          type: 'number',
          category: 'metric',
          label: 'GMV',
          is_active: true,
        },
      ],
    },
    isLoading: false,
    isError: false,
  })),
}));

vi.mock('../../hooks/use-shared-field-mutations', () => ({
  useSharedFieldMutations: vi.fn(() => ({
    createMutation: { mutateAsync: vi.fn(), isPending: false },
    updateMutation: { mutateAsync: vi.fn(), isPending: false },
  })),
}));

describe('studioSharedFieldsSettings', () => {
  it('renders read-only mode for manager role', () => {
    mockUseStudioAccess.mockReturnValue({
      role: STUDIO_ROLE.MANAGER,
    });

    render(<StudioSharedFieldsSettings studioId="std_1" />);

    expect(screen.getByText(/read-only access/i)).toBeInTheDocument();
    expect(screen.queryByText('Create Shared Field')).not.toBeInTheDocument();
  });

  it('renders create form for admin role', () => {
    mockUseStudioAccess.mockReturnValue({
      role: STUDIO_ROLE.ADMIN,
    });

    render(<StudioSharedFieldsSettings studioId="std_1" />);

    expect(screen.getByText('Create Shared Field')).toBeInTheDocument();
  });

  it('toggles each shared-field item details', () => {
    mockUseStudioAccess.mockReturnValue({
      role: STUDIO_ROLE.MANAGER,
    });

    render(<StudioSharedFieldsSettings studioId="std_1" />);

    expect(screen.queryByText('Description')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /gmv/i }));
    expect(screen.getByText('Description')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /gmv/i }));
    expect(screen.queryByText('Description')).not.toBeInTheDocument();
  });
});
