import { createFileRoute, Navigate } from '@tanstack/react-router';

export const Route = createFileRoute('/system/mcs/')({
  component: LegacySystemMcsRoute,
});

function LegacySystemMcsRoute() {
  return <Navigate to="/system/creators" replace />;
}
