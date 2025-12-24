import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { SidebarLayout } from '../sidebar-layout';

// Mock session data
const mockSession = {
  user: {
    name: 'John Doe',
    email: 'john@example.com',
    image: '/avatars/john.jpg',
  },
};

// Create mock functions
const mockUseSidebarConfig = vi.fn();
const mockAppSidebar = vi.fn();

// Mock the session provider hook
vi.mock('@/lib/session-provider', () => ({
  useSession: () => ({ session: mockSession }),
}));

// Mock the sidebar config hook
vi.mock('@/config/sidebar-config', () => ({
  useSidebarConfig: (session: any) => mockUseSidebarConfig(session),
}));

// Mock the AppSidebar component
vi.mock('@eridu/ui', () => ({
  AppSidebar: (...args: any[]) => mockAppSidebar(...args),
}));

// Mock the sidebar components
vi.mock('@eridu/ui/components/ui/sidebar', () => ({
  SidebarInset: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="sidebar-inset">{children}</div>
  ),
  SidebarProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="sidebar-provider">{children}</div>
  ),
}));

// Mock the SidebarLayoutHeader
vi.mock('../sidebar-layout-header', () => ({
  SidebarLayoutHeader: () => <div data-testid="sidebar-layout-header">Header</div>,
}));

// Mock TanStack Router Link
vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, ...props }: any) => <a {...props}>{children}</a>,
}));

describe('sidebarLayout', () => {
  const mockSidebarConfig = {
    header: {
      title: 'Erify',
      subtitle: 'Studio',
      url: '/',
    },
    navMain: [
      {
        title: 'Dashboard',
        url: '/dashboard',
        icon: vi.fn(),
        isActive: true,
        items: [],
      },
    ],
    navMainLabel: 'Activities',
    user: {
      name: 'John Doe',
      email: 'john@example.com',
      avatar: '/avatars/john.jpg',
    },
    onLogout: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseSidebarConfig.mockReturnValue(mockSidebarConfig);
    mockAppSidebar.mockReturnValue(<div data-testid="app-sidebar">AppSidebar</div>);
  });

  it('renders children', () => {
    render(
      <SidebarLayout>
        <div>Test Content</div>
      </SidebarLayout>,
    );

    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });

  it('renders sidebar layout header', () => {
    render(
      <SidebarLayout>
        <div>Test Content</div>
      </SidebarLayout>,
    );

    expect(screen.getByTestId('sidebar-layout-header')).toBeInTheDocument();
    expect(screen.getByText('Header')).toBeInTheDocument();
  });

  it('uses sidebar config from useSidebarConfig hook', () => {
    render(
      <SidebarLayout>
        <div>Test Content</div>
      </SidebarLayout>,
    );

    expect(mockUseSidebarConfig).toHaveBeenCalledTimes(1);
    expect(mockUseSidebarConfig).toHaveBeenCalledWith(mockSession);
  });

  it('passes session to useSidebarConfig hook', () => {
    render(
      <SidebarLayout>
        <div>Test Content</div>
      </SidebarLayout>,
    );

    expect(mockUseSidebarConfig).toHaveBeenCalledWith(mockSession);
  });

  it('renders AppSidebar with sidebar config props', () => {
    render(
      <SidebarLayout>
        <div>Test Content</div>
      </SidebarLayout>,
    );

    expect(mockAppSidebar).toHaveBeenCalledWith(
      expect.objectContaining(mockSidebarConfig),
      undefined,
    );
  });

  it('wraps content in SidebarProvider and SidebarInset', () => {
    render(
      <SidebarLayout>
        <div>Test Content</div>
      </SidebarLayout>,
    );

    expect(screen.getByTestId('sidebar-provider')).toBeInTheDocument();
    expect(screen.getByTestId('sidebar-inset')).toBeInTheDocument();
    expect(screen.getByTestId('app-sidebar')).toBeInTheDocument();
    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });

  it('passes RouterLink as linkComponent to AppSidebar', () => {
    render(
      <SidebarLayout>
        <div>Test Content</div>
      </SidebarLayout>,
    );

    expect(mockAppSidebar).toHaveBeenCalledWith(
      expect.objectContaining({
        ...mockSidebarConfig,
        linkComponent: expect.any(Function),
      }),
      undefined,
    );
  });
});
