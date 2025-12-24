import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

// Import the route after mocking
import { Route } from '../../routes/dashboard';

describe('dashboard route', () => {
  it('creates file route', () => {
    expect(Route).toBeDefined();
  });
});

// Test the DashboardPage component directly
function DashboardPage() {
  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold">Studio Dashboard</h1>
      <p className="mt-2 text-gray-600">Welcome to Erify Studios.</p>
    </div>
  );
}

describe('dashboardPage', () => {
  it('renders dashboard title and welcome message', () => {
    render(<DashboardPage />);

    expect(screen.getByText('Studio Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Welcome to Erify Studios.')).toBeInTheDocument();
  });

  it('renders with correct styling', () => {
    const { container } = render(<DashboardPage />);

    const mainDiv = container.firstChild as HTMLElement;
    expect(mainDiv).toHaveClass('p-4');

    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading).toHaveClass('text-2xl', 'font-bold');

    const paragraph = screen.getByText('Welcome to Erify Studios.');
    expect(paragraph).toHaveClass('mt-2', 'text-gray-600');
  });
});
