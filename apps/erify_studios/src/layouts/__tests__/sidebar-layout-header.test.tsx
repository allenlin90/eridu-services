import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { SidebarLayoutHeader } from '../sidebar-layout-header';

// Mock the SidebarTrigger component
vi.mock('@eridu/ui/components/ui/sidebar', () => ({
  SidebarTrigger: ({ className }: { className?: string }) => (
    <button type="button" data-testid="sidebar-trigger" className={className}>
      Toggle Sidebar
    </button>
  ),
}));

describe('sidebarLayoutHeader', () => {
  it('renders sidebar trigger and title', () => {
    render(<SidebarLayoutHeader />);

    expect(screen.getByTestId('sidebar-trigger')).toBeInTheDocument();
    expect(screen.getByText('Erify Studios')).toBeInTheDocument();
  });

  it('renders header with correct structure', () => {
    render(<SidebarLayoutHeader />);

    const header = screen.getByRole('banner');
    expect(header).toHaveClass('flex', 'h-16', 'shrink-0', 'items-center', 'gap-2', 'border-b', 'px-4');

    const trigger = screen.getByTestId('sidebar-trigger');
    expect(trigger).toHaveClass('-ml-1');
  });
});
