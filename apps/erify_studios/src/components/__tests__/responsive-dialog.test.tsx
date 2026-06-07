import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ResponsiveDialog } from '../responsive-dialog';

const isMobileMock = vi.fn(() => false);

vi.mock('@eridu/ui/hooks/use-is-mobile', () => ({
  useIsMobile: () => isMobileMock(),
}));

type ShellProps = { open: boolean; children: ReactNode };
type ContentProps = { children: ReactNode } & Record<string, unknown>;

// Mock the Dialog/Drawer primitives so we can observe which shell renders and
// whether the aria-describedby key is forwarded to the content element.
vi.mock('@eridu/ui', () => ({
  Dialog: ({ open, children }: ShellProps) => (open ? <div data-testid="dialog">{children}</div> : null),
  DialogContent: ({ children, ...props }: ContentProps) => (
    <div data-testid="dialog-content" data-has-describedby={String('aria-describedby' in props)}>
      {children}
    </div>
  ),
  DialogHeader: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: ReactNode }) => <h2>{children}</h2>,
  DialogDescription: ({ children }: { children: ReactNode }) => <p data-testid="dialog-description">{children}</p>,
  DialogFooter: ({ children }: { children: ReactNode }) => <div data-testid="dialog-footer">{children}</div>,
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

describe('responsiveDialog', () => {
  afterEach(() => {
    isMobileMock.mockReturnValue(false);
  });

  it('renders the Dialog shell on desktop', () => {
    isMobileMock.mockReturnValue(false);
    render(
      <ResponsiveDialog open onOpenChange={vi.fn()} title="Title">
        <div data-testid="body">Body</div>
      </ResponsiveDialog>,
    );

    expect(screen.getByTestId('dialog')).toBeInTheDocument();
    expect(screen.queryByTestId('drawer')).not.toBeInTheDocument();
    expect(screen.getByTestId('body')).toBeInTheDocument();
  });

  it('renders the Drawer shell on mobile', () => {
    isMobileMock.mockReturnValue(true);
    render(
      <ResponsiveDialog open onOpenChange={vi.fn()} title="Title">
        <div data-testid="body">Body</div>
      </ResponsiveDialog>,
    );

    expect(screen.getByTestId('drawer')).toBeInTheDocument();
    expect(screen.queryByTestId('dialog')).not.toBeInTheDocument();
  });

  it('renders title, description and footer when provided', () => {
    render(
      <ResponsiveDialog
        open
        onOpenChange={vi.fn()}
        title="My Title"
        description="My description"
        footer={<button type="button">Save</button>}
      >
        <div>Body</div>
      </ResponsiveDialog>,
    );

    expect(screen.getByRole('heading', { name: 'My Title' })).toBeInTheDocument();
    expect(screen.getByTestId('dialog-description')).toHaveTextContent('My description');
    expect(screen.getByTestId('dialog-footer')).toHaveTextContent('Save');
  });

  it('suppresses aria-describedby when no description is provided', () => {
    render(
      <ResponsiveDialog open onOpenChange={vi.fn()} title="Title">
        <div>Body</div>
      </ResponsiveDialog>,
    );

    // No description rendered, and aria-describedby={undefined} is forwarded to drop the attribute.
    expect(screen.queryByTestId('dialog-description')).not.toBeInTheDocument();
    expect(screen.getByTestId('dialog-content')).toHaveAttribute('data-has-describedby', 'true');
  });

  it('does not override aria-describedby when a description is provided', () => {
    render(
      <ResponsiveDialog open onOpenChange={vi.fn()} title="Title" description="A description">
        <div>Body</div>
      </ResponsiveDialog>,
    );

    // Description present → omit the prop so Radix keeps its auto-generated association.
    expect(screen.getByTestId('dialog-description')).toBeInTheDocument();
    expect(screen.getByTestId('dialog-content')).toHaveAttribute('data-has-describedby', 'false');
  });
});
