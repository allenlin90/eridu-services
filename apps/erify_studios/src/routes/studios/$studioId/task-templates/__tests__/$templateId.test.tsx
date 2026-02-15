import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createRootRoute, createRouter, RouterProvider } from '@tanstack/react-router';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { Route } from '../$templateId';

// Mock child components to simplify integration test
vi.mock('@/components/task-templates/builder/task-template-builder', () => ({
  TaskTemplateBuilder: ({ template, onSave, onCancel }: any) => (
    <div data-testid="builder">
      <h1>Builder for {template.name}</h1>
      <button onClick={() => onSave({ 
        name: 'Updated Name', 
        description: 'Valid Description',
        items: [{
          id: 'item-1',
          key: 'field_1',
          type: 'text',
          label: 'Test Field',
          required: true
        }] 
      })}>Save</button>
      <button onClick={onCancel}>Cancel</button>
    </div>
  ),
}));

// Mock hooks
const mockTaskTemplate = {
  id: 't1',
  name: 'Test Template',
  description: 'Desc',
  version: 1,
  current_schema: { items: [] },
};

const mockUpdate = vi.fn();

vi.mock('@/features/task-templates/hooks/use-task-template', () => ({
  useTaskTemplate: vi.fn(() => ({
    data: mockTaskTemplate,
    isLoading: false,
  })),
}));

vi.mock('@/features/task-templates/hooks/use-update-task-template', () => ({
  useUpdateTaskTemplate: vi.fn(() => ({
    mutate: mockUpdate,
    isPending: false,
  })),
}));

describe('EditTaskTemplatePage', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
    vi.clearAllMocks();
  });

  const renderComponent = () => {
    const rootRoute = createRootRoute({
      component: () => <Route.options.component />,
    });

    const router = createRouter({
      routeTree: rootRoute,
      context: { queryClient },
    });

    // Mock router params
    router.history.push('/studios/s1/task-templates/t1');

    return render(
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>,
    );
  };

  it('renders the builder with template data', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByTestId('builder')).toBeInTheDocument();
      expect(screen.getByText('Builder for Test Template')).toBeInTheDocument();
    });
  });

  it('calls update mutation when save is clicked', async () => {
    const user = userEvent.setup();
    renderComponent();

    await waitFor(() => expect(screen.getByTestId('builder')).toBeInTheDocument());

    await user.click(screen.getByText('Save'));

    expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({
      name: 'Updated Name',
      version: 1,
    }));
  });
});
