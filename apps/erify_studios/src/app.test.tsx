import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import App from './app';

// Mock the router - define the mock object inline to avoid hoisting issues
vi.mock('./router', () => ({
  default: {
    state: { location: { pathname: '/' } },
    subscribe: vi.fn(),
  },
}));

// Mock RouterProvider
vi.mock('@tanstack/react-router', () => ({
  RouterProvider: ({ router }: { router: any }) => (
    <div data-testid="router-provider" data-router={JSON.stringify(router.state)} />
  ),
}));

describe('app', () => {
  it('renders the router provider', () => {
    render(<App />);

    const routerProvider = screen.getByTestId('router-provider');
    expect(routerProvider).toBeInTheDocument();
  });

  it('passes the router to RouterProvider', () => {
    render(<App />);

    const routerProvider = screen.getByTestId('router-provider');
    const routerData = routerProvider.getAttribute('data-router');

    expect(routerData).toBe(JSON.stringify({ location: { pathname: '/' } }));
  });

  it('renders without crashing', () => {
    expect(() => render(<App />)).not.toThrow();
  });
});
