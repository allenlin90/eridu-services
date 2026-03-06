import { createFileRoute, Outlet } from '@tanstack/react-router';

import { PageContainer } from '@/components/layouts/page-container';

export const Route = createFileRoute('/studios/$studioId')({
  component: StudioScopedLayout,
});

function StudioScopedLayout() {
  return (
    <PageContainer>
      <Outlet />
    </PageContainer>
  );
}
