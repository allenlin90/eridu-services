import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { TaskTemplateDto } from '@eridu/api-types/task-management';

import { TaskTemplateList } from '../task-template-list';

vi.mock('@/paraglide/messages', () => ({
  task_type_setup: () => 'Pre-production',
  task_type_active: () => 'On-air',
  task_type_closure: () => 'Post-production',
  task_type_admin: () => 'Admin',
  task_type_routine: () => 'Routine',
  task_type_other: () => 'Other',
}));

const MOCK_TEMPLATES: TaskTemplateDto[] = [
  {
    id: 'ttpl_test_1',
    name: 'Test Template 1',
    description: 'Description 1',
    is_active: true,
    current_schema: { items: [] },
    version: 1,
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-01-15T00:00:00.000Z',
  },
  {
    id: 'ttpl_test_2',
    name: 'Test Template 2',
    description: 'Description 2',
    is_active: false,
    current_schema: { items: [] },
    version: 2,
    created_at: '2024-01-10T00:00:00.000Z',
    updated_at: '2024-01-20T00:00:00.000Z',
  },
];

const mockFetchNextPage = vi.fn();

// Mock Link from @tanstack/react-router since TaskTemplateList renders TaskTemplateCard which uses Link
vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, ...props }: any) => <a {...props}>{children}</a>,
}));

// Mock useCreateTaskTemplate hook used by TaskTemplateCard
const mockMutate = vi.fn();
vi.mock('../../hooks/use-create-task-template', () => ({
  useCreateTaskTemplate: vi.fn(() => ({
    mutate: mockMutate,
    isPending: false,
  })),
}));

// Mock useDeleteTaskTemplate hook used by TaskTemplateCard
vi.mock('../../hooks/use-delete-task-template', () => ({
  useDeleteTaskTemplate: vi.fn(() => ({
    mutate: vi.fn(),
    isPending: false,
  })),
}));

// Mock toast from sonner
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('taskTemplateList', () => {
  it('renders loading skeletons when loading', () => {
    render(
      <TaskTemplateList
        templates={[]}
        isLoading
        isError={false}
        hasNextPage={false}
        isFetchingNextPage={false}
        fetchNextPage={mockFetchNextPage}
        studioId="test-studio"
      />,
    );

    // Should render skeleton loaders with animate-pulse class
    const skeletons = document.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('renders error state when error occurs', () => {
    render(
      <TaskTemplateList
        templates={[]}
        isLoading={false}
        isError
        hasNextPage={false}
        isFetchingNextPage={false}
        fetchNextPage={mockFetchNextPage}
        studioId="test-studio"
      />,
    );

    expect(screen.getByText('Failed to load templates')).toBeInTheDocument();
    expect(
      screen.getByText(/There was an error loading the task templates/i),
    ).toBeInTheDocument();
  });

  it('renders empty state when no templates', () => {
    render(
      <TaskTemplateList
        templates={[]}
        isLoading={false}
        isError={false}
        hasNextPage={false}
        isFetchingNextPage={false}
        fetchNextPage={mockFetchNextPage}
        studioId="test-studio"
      />,
    );

    expect(screen.getByText('No templates found')).toBeInTheDocument();
    expect(
      screen.getByText('Create a new template to get started.'),
    ).toBeInTheDocument();
  });

  it('renders template cards when data is present', () => {
    render(
      <TaskTemplateList
        templates={MOCK_TEMPLATES}
        isLoading={false}
        isError={false}
        hasNextPage={false}
        isFetchingNextPage={false}
        fetchNextPage={mockFetchNextPage}
        studioId="test-studio"
      />,
    );

    expect(screen.getByText('Test Template 1')).toBeInTheDocument();
    expect(screen.getByText('Test Template 2')).toBeInTheDocument();
  });
});
