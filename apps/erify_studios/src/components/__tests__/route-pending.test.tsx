import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { RoutePending } from '../route-pending';

// Mock the LoadingPage component from @eridu/ui
vi.mock('@eridu/ui', () => ({
  LoadingPage: () => <div data-testid="loading-page">Loading...</div>,
}));

describe('routePending', () => {
  it('renders loading page', () => {
    render(<RoutePending />);

    expect(screen.getByTestId('loading-page')).toBeInTheDocument();
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });
});
