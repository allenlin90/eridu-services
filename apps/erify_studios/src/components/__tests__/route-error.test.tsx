import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { RouteError } from '../route-error';

describe('routeError', () => {
  it('renders error message', () => {
    const error = new Error('Test error message');
    render(<RouteError error={error} reset={() => {}} />);

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText('Test error message')).toBeInTheDocument();
  });

  it('renders default message when error has no message', () => {
    const error = new Error('No message');
    // Override message property to simulate empty message
    Object.defineProperty(error, 'message', { value: '', writable: true });
    render(<RouteError error={error} reset={() => {}} />);

    expect(screen.getByText('An unexpected error occurred')).toBeInTheDocument();
  });

  it('calls reset function when Try Again button is clicked', async () => {
    const user = userEvent.setup();
    const error = new Error('Test error');
    const reset = vi.fn();

    render(<RouteError error={error} reset={reset} />);

    const tryAgainButton = screen.getByRole('button', { name: /try again/i });
    await user.click(tryAgainButton);

    expect(reset).toHaveBeenCalledOnce();
  });

  it('renders Reload Page button', () => {
    const error = new Error('Test error');
    render(<RouteError error={error} reset={() => {}} />);

    const reloadButton = screen.getByRole('button', { name: /reload page/i });
    expect(reloadButton).toBeInTheDocument();
    expect(reloadButton).toHaveAttribute('type', 'button');
  });
});
