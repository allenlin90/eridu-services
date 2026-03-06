import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { TaskTemplatesToolbar } from '../task-templates-toolbar';

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => mockNavigate,
}));

const mockOnColumnFiltersChange = vi.fn();
const mockOnRefresh = vi.fn();

const mockTableState = {
  columnFilters: [],
  onColumnFiltersChange: mockOnColumnFiltersChange,
  pagination: { pageIndex: 0, pageSize: 20 },
  onPaginationChange: vi.fn(),
  sorting: [],
  onSortingChange: vi.fn(),
  setPageCount: vi.fn(),
};

describe('taskTemplatesToolbar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock window.matchMedia for desktop view by default
    window.matchMedia = vi.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(), // Deprecated
      removeListener: vi.fn(), // Deprecated
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
  });

  it('renders search input and actions', () => {
    render(
      <TaskTemplatesToolbar
        tableState={mockTableState}
        onRefresh={mockOnRefresh}
        studioId="test-studio"
      />,
    );

    expect(screen.getByPlaceholderText('Search templates...')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Refresh templates' })).toBeInTheDocument();
    expect(screen.getByText('Create Template')).toBeInTheDocument();
  });

  it('calls onRefresh when refresh button is clicked', async () => {
    const user = userEvent.setup();
    render(
      <TaskTemplatesToolbar
        tableState={mockTableState}
        onRefresh={mockOnRefresh}
        studioId="test-studio"
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Refresh templates' }));
    expect(mockOnRefresh).toHaveBeenCalledTimes(1);
  });

  it('navigates to new template page when create button is clicked', async () => {
    const user = userEvent.setup();
    render(
      <TaskTemplatesToolbar
        tableState={mockTableState}
        onRefresh={mockOnRefresh}
        studioId="test-studio"
      />,
    );

    await user.click(screen.getByText('Create Template'));
    expect(mockNavigate).toHaveBeenCalledWith({
      to: '/studios/$studioId/task-templates/new',
      params: { studioId: 'test-studio' },
    });
  });

  it('disables refresh button when isRefreshing is true', () => {
    render(
      <TaskTemplatesToolbar
        tableState={mockTableState}
        onRefresh={mockOnRefresh}
        isRefreshing
        studioId="test-studio"
      />,
    );

    const refreshButton = screen.getByRole('button', { name: 'Refresh templates' });
    expect(refreshButton).toBeDisabled();
  });

  it('debounces search input changes', async () => {
    const user = userEvent.setup();
    render(
      <TaskTemplatesToolbar
        tableState={mockTableState}
        onRefresh={mockOnRefresh}
        studioId="test-studio"
      />,
    );

    const input = screen.getByPlaceholderText('Search templates...');
    await user.type(input, 'test');

    expect(mockOnColumnFiltersChange).not.toHaveBeenCalled();

    await waitFor(
      () => {
        expect(mockOnColumnFiltersChange).toHaveBeenCalled();
      },
      { timeout: 500 },
    );
  });
});
