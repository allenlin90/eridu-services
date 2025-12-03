import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { SidebarLayout } from '../sidebar-layout';

// Create mock functions
const mockUseSidebarConfig = vi.fn();
const mockAppSidebar = vi.fn();
const mockUseSession = vi.fn();

// Mock the session provider hook
vi.mock('@/lib/session-provider', () => ({
  useSession: () => mockUseSession(),
}));

// Mock the sidebar config hook
vi.mock('@/config/sidebar-config', () => ({
  useSidebarConfig: (session: any) => mockUseSidebarConfig(session),
}));

// Mock the AppSidebar component
vi.mock('@eridu/ui', () => ({
  AppSidebar: (...args: any[]) => mockAppSidebar(...args),
}));

describe('sidebarLayout', () => {
  const mockSession = {
    user: {
      name: 'John Doe',
      email: 'john@example.com',
      image: '/avatars/john.jpg',
    },
  };

  const mockSidebarConfig = {
    header: {
      title: 'Erify',
      subtitle: 'Studio',
      url: '/',
    },
    navMain: [
      {
        title: 'Shows',
        url: '/shows',
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
    mockUseSession.mockReturnValue({ session: mockSession });
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

    expect(screen.getByText('Erify Creators')).toBeInTheDocument();
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

  it('passes null session when no user is authenticated', () => {
    mockUseSession.mockReturnValueOnce({ session: null });

    render(
      <SidebarLayout>
        <div>Test Content</div>
      </SidebarLayout>,
    );

    expect(mockUseSidebarConfig).toHaveBeenCalledWith(null);
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
    const { container } = render(
      <SidebarLayout>
        <div>Test Content</div>
      </SidebarLayout>,
    );

    // The structure should be: SidebarProvider > AppSidebar + SidebarInset
    // SidebarInset should contain SidebarLayoutHeader and children
    expect(container.firstChild).toBeTruthy();
    expect(screen.getByTestId('app-sidebar')).toBeInTheDocument();
    expect(screen.getByText('Test Content')).toBeInTheDocument();
    expect(screen.getByText('Erify Creators')).toBeInTheDocument();
  });
});
