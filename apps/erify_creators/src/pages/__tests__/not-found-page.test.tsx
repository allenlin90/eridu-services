import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { NotFoundPage } from '../not-found-page';

// Mock TanStack Router Link component
vi.mock('@tanstack/react-router', () => ({
  Link: ({ to, children, ...props }: any) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
}));

describe('notFoundPage', () => {
  it('renders 404 heading', () => {
    render(<NotFoundPage />);

    expect(screen.getByText('404')).toBeInTheDocument();
  });

  it('renders page not found message', () => {
    render(<NotFoundPage />);

    expect(screen.getByText('Page Not Found')).toBeInTheDocument();
    expect(
      screen.getByText(
        'The page you\'re looking for doesn\'t exist or has been moved.',
      ),
    ).toBeInTheDocument();
  });

  it('renders go home button', () => {
    render(<NotFoundPage />);

    const goHomeButton = screen.getByRole('link', { name: /go home/i });
    expect(goHomeButton).toBeInTheDocument();
    expect(goHomeButton).toHaveAttribute('href', '/');
  });
});
