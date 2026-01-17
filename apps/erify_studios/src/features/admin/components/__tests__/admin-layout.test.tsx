import { useIsFetching } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { AdminLayout } from '../admin-layout';

// Mock React Query
vi.mock('@tanstack/react-query', () => ({
  useIsFetching: vi.fn(() => 0),
}));

// Mock UI components
vi.mock('@eridu/ui', () => ({
  Button: ({ children, onClick, disabled, ...props }: any) => (
    <button type="button" onClick={onClick} disabled={disabled} {...props}>
      {children}
    </button>
  ),
}));

// Mock lucide-react
vi.mock('lucide-react', () => ({
  RotateCw: ({ className }: any) => <span data-testid="rotate-icon" className={className}>↻</span>,
}));

const mockedUseIsFetching = vi.mocked(useIsFetching);

describe('adminLayout', () => {
  it('renders title', () => {
    render(
      <AdminLayout title="Test Title">
        <div>Content</div>
      </AdminLayout>,
    );

    expect(screen.getByText('Test Title')).toBeInTheDocument();
  });

  it('renders description when provided', () => {
    render(
      <AdminLayout title="Test Title" description="Test Description">
        <div>Content</div>
      </AdminLayout>,
    );

    expect(screen.getByText('Test Description')).toBeInTheDocument();
  });

  it('does not render description when not provided', () => {
    render(
      <AdminLayout title="Test Title">
        <div>Content</div>
      </AdminLayout>,
    );

    expect(screen.queryByText('Test Description')).not.toBeInTheDocument();
  });

  it('renders children', () => {
    render(
      <AdminLayout title="Test Title">
        <div data-testid="test-content">Test Content</div>
      </AdminLayout>,
    );

    expect(screen.getByTestId('test-content')).toBeInTheDocument();
  });

  it('renders action button when provided', () => {
    const onActionClick = vi.fn();
    render(
      <AdminLayout
        title="Test Title"
        action={{ label: 'Add New', onClick: onActionClick }}
      >
        <div>Content</div>
      </AdminLayout>,
    );

    const button = screen.getByText('Add New');
    expect(button).toBeInTheDocument();

    fireEvent.click(button);
    expect(onActionClick).toHaveBeenCalled();
  });

  it('does not render action button when not provided', () => {
    render(
      <AdminLayout title="Test Title">
        <div>Content</div>
      </AdminLayout>,
    );

    expect(screen.queryByText('Add New')).not.toBeInTheDocument();
  });

  it('renders refresh button when onRefresh is provided', () => {
    const onRefresh = vi.fn();
    render(
      <AdminLayout title="Test Title" onRefresh={onRefresh}>
        <div>Content</div>
      </AdminLayout>,
    );

    const refreshButton = screen.getByText('Refresh');
    expect(refreshButton).toBeInTheDocument();

    fireEvent.click(refreshButton);
    expect(onRefresh).toHaveBeenCalled();
  });

  it('does not render refresh button when onRefresh is not provided', () => {
    render(
      <AdminLayout title="Test Title">
        <div>Content</div>
      </AdminLayout>,
    );

    expect(screen.queryByText('Refresh')).not.toBeInTheDocument();
  });

  it('refresh button is disabled when fetching', () => {
    mockedUseIsFetching.mockReturnValue(1); // Simulate fetching

    const onRefresh = vi.fn();
    render(
      <AdminLayout
        title="Test Title"
        onRefresh={onRefresh}
        refreshQueryKey={['test-query']}
      >
        <div>Content</div>
      </AdminLayout>,
    );

    const refreshButton = screen.getByText('Refresh');
    expect(refreshButton).toBeDisabled();

    mockedUseIsFetching.mockReturnValue(0); // Reset
  });

  it('refresh button is enabled when not fetching', () => {
    mockedUseIsFetching.mockReturnValue(0); // Not fetching

    const onRefresh = vi.fn();
    render(
      <AdminLayout
        title="Test Title"
        onRefresh={onRefresh}
        refreshQueryKey={['test-query']}
      >
        <div>Content</div>
      </AdminLayout>,
    );

    const refreshButton = screen.getByText('Refresh');
    expect(refreshButton).not.toBeDisabled();
  });

  it('shows spinning icon when fetching', () => {
    mockedUseIsFetching.mockReturnValue(1); // Simulate fetching

    render(
      <AdminLayout
        title="Test Title"
        onRefresh={vi.fn()}
        refreshQueryKey={['test-query']}
      >
        <div>Content</div>
      </AdminLayout>,
    );

    const icon = screen.getByTestId('rotate-icon');
    expect(icon).toHaveClass('animate-spin');

    mockedUseIsFetching.mockReturnValue(0); // Reset
  });

  it('does not show spinning icon when not fetching', () => {
    mockedUseIsFetching.mockReturnValue(0); // Not fetching

    render(
      <AdminLayout
        title="Test Title"
        onRefresh={vi.fn()}
        refreshQueryKey={['test-query']}
      >
        <div>Content</div>
      </AdminLayout>,
    );

    const icon = screen.getByTestId('rotate-icon');
    expect(icon).not.toHaveClass('animate-spin');
  });

  it('renders both action and refresh buttons together', () => {
    render(
      <AdminLayout
        title="Test Title"
        action={{ label: 'Add New', onClick: vi.fn() }}
        onRefresh={vi.fn()}
      >
        <div>Content</div>
      </AdminLayout>,
    );

    expect(screen.getByText('Add New')).toBeInTheDocument();
    expect(screen.getByText('Refresh')).toBeInTheDocument();
  });
});
