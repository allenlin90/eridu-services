import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { SidebarProvider } from '@eridu/ui/components/ui/sidebar';

import { SidebarLayoutHeader } from '../sidebar-layout-header';

describe('sidebarLayoutHeader', () => {
  it('renders header with title', () => {
    render(
      <SidebarProvider>
        <SidebarLayoutHeader />
      </SidebarProvider>,
    );

    expect(screen.getByText('Erify Creators')).toBeInTheDocument();
  });

  it('renders sidebar trigger', () => {
    render(
      <SidebarProvider>
        <SidebarLayoutHeader />
      </SidebarProvider>,
    );

    const trigger = screen.getByRole('button');
    expect(trigger).toBeInTheDocument();
  });

  it('has correct header structure', () => {
    render(
      <SidebarProvider>
        <SidebarLayoutHeader />
      </SidebarProvider>,
    );

    const header = screen.getByRole('banner');
    expect(header).toBeInTheDocument();
    expect(header).toHaveClass('flex', 'h-16', 'shrink-0');
  });
});
