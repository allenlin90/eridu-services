import { createFileRoute, Outlet } from '@tanstack/react-router';

export const Route = createFileRoute('/studios/$studioId/shows')({
  component: RouteComponent,
});

function RouteComponent() {
  return <Outlet />;
}
