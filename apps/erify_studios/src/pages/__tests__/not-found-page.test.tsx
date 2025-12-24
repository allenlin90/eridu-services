import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { NotFoundPage } from '../not-found-page';

// Mock TanStack Router Link
vi.mock('@tanstack/react-router', () => ({
  Link: ({ to, children }: { to: string; children: React.ReactNode }) => (
    <a href={to} data-testid="link">
      {children}
    </a>
  ),
}));

// Mock Button component
vi.mock('@eridu/ui', () => ({
  Button: ({ asChild, children }: { asChild?: boolean; children: React.ReactNode }) => (
    asChild ? children : <button type="button">{children}</button>
  ),
}));

describe('notFoundPage', () => {
  it('renders 404 error message', () => {
    render(<NotFoundPage />);

    expect(screen.getByText('404')).toBeInTheDocument();
    expect(screen.getByText('Page Not Found')).toBeInTheDocument();
  });

  it('renders error description', () => {
    render(<NotFoundPage />);

    expect(
      screen.getByText('The page you\'re looking for doesn\'t exist or has been moved.'),
    ).toBeInTheDocument();
  });

  it('renders Go Home button with link', () => {
    render(<NotFoundPage />);

    const link = screen.getByTestId('link');
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/');
    expect(screen.getByText('Go Home')).toBeInTheDocument();
  });

  it('renders with correct styling', () => {
    const { container } = render(<NotFoundPage />);

    const mainDiv = container.firstChild as HTMLElement;
    expect(mainDiv).toHaveClass(
      'flex',
      'min-h-[calc(100vh-4rem)]',
      'items-center',
      'justify-center',
      'p-4',
    );

    const heading404 = screen.getByText('404');
    expect(heading404).toHaveClass(
      'text-6xl',
      'font-bold',
      'text-gray-900',
      'dark:text-gray-100',
    );

    const headingNotFound = screen.getByText('Page Not Found');
    expect(headingNotFound).toHaveClass(
      'mt-4',
      'text-2xl',
      'font-semibold',
      'text-gray-700',
      'dark:text-gray-300',
    );

    const description = screen.getByText(
      'The page you\'re looking for doesn\'t exist or has been moved.',
    );
    expect(description).toHaveClass('mt-4', 'text-gray-600', 'dark:text-gray-400');
  });
});
