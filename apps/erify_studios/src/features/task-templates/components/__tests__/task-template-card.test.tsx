import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import type { TaskTemplateDto } from '@eridu/api-types/task-management';

import { TaskTemplateCard } from '../task-template-card';

// Mock Link from @tanstack/react-router
vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to, params, ...props }: any) => (
    <a
      href={to.replace('$studioId', params.studioId).replace('$templateId', params.templateId)}
      data-testid="mock-link"
      {...props}
    >
      {children}
    </a>
  ),
}));

const mockCreateMutate = vi.fn();
vi.mock('../../hooks/use-create-task-template', () => ({
  useCreateTaskTemplate: vi.fn(() => ({
    mutate: mockCreateMutate,
    isPending: false,
  })),
}));

const mockDeleteMutate = vi.fn();
vi.mock('../../hooks/use-delete-task-template', () => ({
  useDeleteTaskTemplate: vi.fn(() => ({
    mutate: mockDeleteMutate,
    isPending: false,
  })),
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const MOCK_TEMPLATE: TaskTemplateDto = {
  id: 'ttpl_test_123',
  name: 'Test Template',
  description: 'A test description',
  is_active: true,
  task_type: 'SETUP',
  current_schema: { items: [] },
  version: 2,
  created_at: '2024-01-01T00:00:00.000Z',
  updated_at: '2024-01-15T00:00:00.000Z',
};

describe('taskTemplateCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders template details correctly', () => {
    render(<TaskTemplateCard template={MOCK_TEMPLATE} studioId="test-studio" />);

    expect(screen.getByText('Test Template')).toBeInTheDocument();
    expect(screen.getByText('A test description')).toBeInTheDocument();
    expect(screen.getByText(/v2/)).toBeInTheDocument();
    expect(screen.getByText('Pre-production')).toBeInTheDocument();
    expect(screen.getByText(/Updated Jan 15, 2024/)).toBeInTheDocument();
  });

  it('renders "View Details" link correctly', () => {
    render(<TaskTemplateCard template={MOCK_TEMPLATE} studioId="test-studio" />);

    const viewLink = screen.getByText('View Details').closest('a');
    expect(viewLink).toHaveAttribute('href', '/studios/test-studio/task-templates/ttpl_test_123');
  });

  it('displays task_type badge for archived templates', () => {
    const archivedTemplate = { ...MOCK_TEMPLATE, is_active: false };
    render(<TaskTemplateCard template={archivedTemplate} studioId="test-studio" />);

    expect(screen.getByText('Pre-production')).toBeInTheDocument();
  });

  it('calls clone mutation when clone button is clicked', async () => {
    const user = userEvent.setup();
    render(<TaskTemplateCard template={MOCK_TEMPLATE} studioId="test-studio" />);

    // Open dropdown
    const menuTrigger = screen.getByRole('button', { name: /more actions/i });
    await user.click(menuTrigger);

    // Click clone
    const cloneButton = screen.getByText('Clone');
    await user.click(cloneButton);

    expect(mockCreateMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Test Template (Copy)',
        description: 'A test description',
        schema: expect.objectContaining({
          items: expect.any(Array),
        }),
      }),
    );
  });

  it('opens delete confirmation dialog and calls delete mutation when confirmed', async () => {
    const user = userEvent.setup();
    render(<TaskTemplateCard template={MOCK_TEMPLATE} studioId="test-studio" />);

    // Open dropdown
    const menuTrigger = screen.getByRole('button', { name: /more actions/i });
    await user.click(menuTrigger);

    // Click delete
    const deleteButton = screen.getByText('Delete');
    await user.click(deleteButton);

    // Verify dialog is open
    expect(screen.getByText(/Delete Task Template/i)).toBeInTheDocument();
    expect(screen.getByText(/Are you sure you want to delete "Test Template"?/i)).toBeInTheDocument();

    // Confirm delete
    const confirmButton = screen.getByRole('button', { name: /^delete$/i });
    await user.click(confirmButton);

    expect(mockDeleteMutate).toHaveBeenCalledWith(MOCK_TEMPLATE.id);
  });

  it('does not call delete mutation when confirmation dialog is cancelled', async () => {
    const user = userEvent.setup();
    render(<TaskTemplateCard template={MOCK_TEMPLATE} studioId="test-studio" />);

    // Open dropdown
    const menuTrigger = screen.getByRole('button', { name: /more actions/i });
    await user.click(menuTrigger);

    // Click delete
    const deleteButton = screen.getByText('Delete');
    await user.click(deleteButton);

    // Cancel delete
    const cancelButton = screen.getByText('Cancel');
    await user.click(cancelButton);

    expect(mockDeleteMutate).not.toHaveBeenCalled();
    expect(screen.queryByText(/Delete Task Template/i)).not.toBeInTheDocument();
  });
});
