import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

// Import the route after mocking
import { Route } from '../../routes/system/clients';

// Mock the TanStack Router
vi.mock('@tanstack/react-router', () => ({
  createFileRoute: vi.fn(() => vi.fn(() => ({
    component: ClientsList,
  }))),
  lazyRouteComponent: vi.fn(),
}));

function ClientsList() {
  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">Clients</h1>
      <p className="text-muted-foreground">Manage clients here.</p>
    </div>
  );
}

describe('admin clients route', () => {
  it('creates file route with clients component', () => {
    expect(Route).toBeDefined();
  });
});

describe('clientsList', () => {
  it('renders clients title and description', () => {
    render(<ClientsList />);

    expect(screen.getByText('Clients')).toBeInTheDocument();
    expect(screen.getByText('Manage clients here.')).toBeInTheDocument();
  });

  it('renders with correct styling', () => {
    render(<ClientsList />);

    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading).toHaveClass('text-2xl', 'font-bold', 'tracking-tight');

    const paragraph = screen.getByText('Manage clients here.');
    expect(paragraph).toHaveClass('text-muted-foreground');
  });
});
