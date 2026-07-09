import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ResponsiveSheet } from '../responsive-sheet';

const isMobileMock = vi.fn(() => false);

vi.mock('@eridu/ui/hooks/use-is-mobile', () => ({
  useIsMobile: () => isMobileMock(),
}));

type ShellProps = { open: boolean; children: ReactNode };
type ContentProps = { children: ReactNode } & Record<string, unknown>;

// Mock the Sheet/Drawer primitives so we can observe which shell renders and
// whether the aria-describedby key is forwarded to the content element.
vi.mock('@eridu/ui', () => ({
  Sheet: ({ open, children }: ShellProps) => (open ? <div data-testid="sheet">{children}</div> : null),
  SheetContent: ({ children, ...props }: ContentProps) => (
    <div data-testid="sheet-content" data-has-describedby={String('aria-describedby' in props)}>
      {children}
    </div>
  ),
  SheetHeader: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SheetTitle: ({ children }: { children: ReactNode }) => <h2>{children}</h2>,
  SheetDescription: ({ children }: { children: ReactNode }) => <p data-testid="sheet-description">{children}</p>,
  SheetFooter: ({ children }: { children: ReactNode }) => <div data-testid="sheet-footer">{children}</div>,
  Drawer: ({ open, children }: ShellProps) => (open ? <div data-testid="drawer">{children}</div> : null),
  DrawerContent: ({ children, ...props }: ContentProps) => (
    <div data-testid="drawer-content" data-has-describedby={String('aria-describedby' in props)}>
      {children}
    </div>
  ),
  DrawerHeader: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DrawerTitle: ({ children }: { children: ReactNode }) => <h2>{children}</h2>,
  DrawerDescription: ({ children }: { children: ReactNode }) => <p data-testid="drawer-description">{children}</p>,
  DrawerFooter: ({ children }: { children: ReactNode }) => <div data-testid="drawer-footer">{children}</div>,
}));

describe('responsiveSheet', () => {
  afterEach(() => {
    isMobileMock.mockReturnValue(false);
  });

  it('renders the Sheet shell on desktop', () => {
    isMobileMock.mockReturnValue(false);
    render(
      <ResponsiveSheet open onOpenChange={vi.fn()} title="Review conflict">
        <div data-testid="body">diff content</div>
      </ResponsiveSheet>,
    );

    expect(screen.getByTestId('sheet')).toBeInTheDocument();
    expect(screen.queryByTestId('drawer')).not.toBeInTheDocument();
    expect(screen.getByTestId('body')).toBeInTheDocument();
  });

  it('renders the Drawer shell on mobile', () => {
    isMobileMock.mockReturnValue(true);
    render(
      <ResponsiveSheet open onOpenChange={vi.fn()} title="Review conflict">
        <div data-testid="body">diff content</div>
      </ResponsiveSheet>,
    );

    expect(screen.getByTestId('drawer')).toBeInTheDocument();
    expect(screen.queryByTestId('sheet')).not.toBeInTheDocument();
  });

  it('renders title, description and footer when provided', () => {
    render(
      <ResponsiveSheet
        open
        onOpenChange={vi.fn()}
        title="Review conflict"
        description="Conflicting schedules detected"
        footer={<button type="button">Resolve</button>}
      >
        <div>diff content</div>
      </ResponsiveSheet>,
    );

    expect(screen.getByRole('heading', { name: 'Review conflict' })).toBeInTheDocument();
    expect(screen.getByTestId('sheet-description')).toHaveTextContent('Conflicting schedules detected');
    expect(screen.getByTestId('sheet-footer')).toHaveTextContent('Resolve');
  });

  it('suppresses aria-describedby when no description is provided', () => {
    render(
      <ResponsiveSheet open onOpenChange={vi.fn()} title="Review conflict">
        <div>diff content</div>
      </ResponsiveSheet>,
    );

    // No description rendered, and aria-describedby={undefined} is forwarded to drop the attribute.
    expect(screen.queryByTestId('sheet-description')).not.toBeInTheDocument();
    expect(screen.getByTestId('sheet-content')).toHaveAttribute('data-has-describedby', 'true');
  });

  it('does not override aria-describedby when a description is provided', () => {
    render(
      <ResponsiveSheet open onOpenChange={vi.fn()} title="Review conflict" description="A description">
        <div>diff content</div>
      </ResponsiveSheet>,
    );

    // Description present → omit the prop so Radix keeps its auto-generated association.
    expect(screen.getByTestId('sheet-description')).toBeInTheDocument();
    expect(screen.getByTestId('sheet-content')).toHaveAttribute('data-has-describedby', 'false');
  });

  it('renders nothing when closed', () => {
    isMobileMock.mockReturnValue(false);
    render(
      <ResponsiveSheet open={false} title="Review conflict" onOpenChange={vi.fn()}>
        <div data-testid="body">diff content</div>
      </ResponsiveSheet>,
    );

    expect(screen.queryByTestId('body')).not.toBeInTheDocument();
  });
});
