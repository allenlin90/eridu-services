import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ResponsiveCardGrid } from '../responsive-card-grid';

describe('responsiveCardGrid', () => {
  it('renders children correctly', () => {
    render(
      <ResponsiveCardGrid>
        <div data-testid="card-1">Card 1</div>
        <div data-testid="card-2">Card 2</div>
        <div data-testid="card-3">Card 3</div>
      </ResponsiveCardGrid>,
    );

    expect(screen.getByTestId('card-1')).toBeInTheDocument();
    expect(screen.getByTestId('card-2')).toBeInTheDocument();
    expect(screen.getByTestId('card-3')).toBeInTheDocument();
  });

  it('applies grid class', () => {
    const { container } = render(
      <ResponsiveCardGrid>
        <div>Card</div>
      </ResponsiveCardGrid>,
    );

    expect(container.firstChild).toHaveClass('grid');
  });

  it('applies custom className', () => {
    const { container } = render(
      <ResponsiveCardGrid className="custom-class">
        <div>Card</div>
      </ResponsiveCardGrid>,
    );

    expect(container.firstChild).toHaveClass('grid', 'custom-class');
  });

  it('applies default grid styles', () => {
    const { container } = render(
      <ResponsiveCardGrid>
        <div>Card</div>
      </ResponsiveCardGrid>,
    );

    const grid = container.firstChild as HTMLElement;
    expect(grid.style.gridTemplateColumns).toBe(
      'repeat(auto-fill, minmax(min(100%, 17.5rem), 1fr))',
    );
    expect(grid.style.gap).toBe('1.5rem');
  });

  it('applies custom minCardWidth and gap', () => {
    const { container } = render(
      <ResponsiveCardGrid minCardWidth="20rem" gap="2rem">
        <div>Card</div>
      </ResponsiveCardGrid>,
    );

    const grid = container.firstChild as HTMLElement;
    expect(grid.style.gridTemplateColumns).toBe(
      'repeat(auto-fill, minmax(min(100%, 20rem), 1fr))',
    );
    expect(grid.style.gap).toBe('2rem');
  });
});
