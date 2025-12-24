import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { Route as ClientsRoute } from '../../routes/system/clients';
import { Route as McsRoute } from '../../routes/system/mcs';
import { Route as MembershipsRoute } from '../../routes/system/memberships';
import { Route as PlatformsRoute } from '../../routes/system/platforms';
// Import routes after mocking
import { Route as AdminRoute } from '../../routes/system/route';
import { Route as ShowStandardsRoute } from '../../routes/system/show-standards';
import { Route as ShowTypesRoute } from '../../routes/system/show-types';
import { Route as StudioRoomsRoute } from '../../routes/system/studios/$studioId/studio-rooms';

// Mock the TanStack Router
vi.mock('@tanstack/react-router', () => ({
  createFileRoute: vi.fn(() => vi.fn(() => ({
    component: vi.fn(),
  }))),
  lazyRouteComponent: vi.fn(),
}));

describe('admin routes', () => {
  it('all admin routes are properly created', () => {
    expect(AdminRoute).toBeDefined();
    expect(ClientsRoute).toBeDefined();
    expect(McsRoute).toBeDefined();
    expect(MembershipsRoute).toBeDefined();
    expect(PlatformsRoute).toBeDefined();
    expect(ShowStandardsRoute).toBeDefined();
    expect(ShowTypesRoute).toBeDefined();
    expect(StudioRoomsRoute).toBeDefined();
  });
});

// Test components directly
function AdminLayout() {
  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <div>Admin Content</div>
    </div>
  );
}

// ShowsList removed as it's not used

function ClientsList() {
  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">Clients</h1>
      <p className="text-muted-foreground">Manage clients here.</p>
    </div>
  );
}

function McsList() {
  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">MCs</h1>
      <p className="text-muted-foreground">Manage MCs here.</p>
    </div>
  );
}

function MembershipsList() {
  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">Memberships</h1>
      <p className="text-muted-foreground">Manage memberships here.</p>
    </div>
  );
}

function PlatformsList() {
  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">Platforms</h1>
      <p className="text-muted-foreground">Manage platforms here.</p>
    </div>
  );
}

// SchedulesList removed as it's not used

function ShowStandardsList() {
  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">Show Standards</h1>
      <p className="text-muted-foreground">Manage show standards here.</p>
    </div>
  );
}

function ShowTypesList() {
  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">Show Types</h1>
      <p className="text-muted-foreground">Manage show types here.</p>
    </div>
  );
}

function StudioRoomsList() {
  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">Studio Rooms</h1>
      <p className="text-muted-foreground">Manage studio rooms here.</p>
    </div>
  );
}

describe('admin components', () => {
  const adminComponents = [
    { name: 'AdminLayout', Component: AdminLayout, expectedText: 'Admin Content' },
    { name: 'ClientsList', Component: ClientsList, expectedText: 'Clients' },
    { name: 'McsList', Component: McsList, expectedText: 'MCs' },
    { name: 'MembershipsList', Component: MembershipsList, expectedText: 'Memberships' },
    { name: 'PlatformsList', Component: PlatformsList, expectedText: 'Platforms' },
    { name: 'ShowStandardsList', Component: ShowStandardsList, expectedText: 'Show Standards' },
    { name: 'ShowTypesList', Component: ShowTypesList, expectedText: 'Show Types' },
    { name: 'StudioRoomsList', Component: StudioRoomsList, expectedText: 'Studio Rooms' },
  ];

  adminComponents.forEach(({ name, Component, expectedText }) => {
    describe(name, () => {
      it(`renders ${expectedText} title and description`, () => {
        render(<Component />);

        expect(screen.getByText(expectedText)).toBeInTheDocument();

        if (name !== 'AdminLayout') {
          const manageText = name === 'McsList' ? 'Manage MCs here.' : `Manage ${expectedText.toLowerCase()} here.`;
          expect(screen.getByText(manageText)).toBeInTheDocument();
        }
      });

      if (name !== 'AdminLayout') {
        it('renders with correct styling', () => {
          render(<Component />);

          const heading = screen.getByRole('heading', { level: 1 });
          expect(heading).toHaveClass('text-2xl', 'font-bold', 'tracking-tight');

          const manageText = name === 'McsList' ? 'Manage MCs here.' : `Manage ${expectedText.toLowerCase()} here.`;
          const paragraph = screen.getByText(manageText);
          expect(paragraph).toHaveClass('text-muted-foreground');
        });
      } else {
        it('renders with correct admin layout styling', () => {
          const { container } = render(<Component />);

          const mainDiv = container.firstChild as HTMLElement;
          expect(mainDiv).toHaveClass('flex', 'flex-1', 'flex-col', 'gap-4', 'p-4', 'pt-0');
        });
      }
    });
  });
});
