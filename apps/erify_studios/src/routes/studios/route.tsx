import { createFileRoute, Outlet } from '@tanstack/react-router';

export const Route = createFileRoute('/studios')({
  component: StudioLayout,
});

function StudioLayout() {
  return <Outlet />;
}
