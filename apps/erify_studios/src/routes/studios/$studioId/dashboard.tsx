import { createFileRoute } from '@tanstack/react-router';

import { PageLayout } from '@/components/layouts/page-layout';

export const Route = createFileRoute('/studios/$studioId/dashboard')({
  component: StudioDashboardPage,
});

function StudioDashboardPage() {
  const { studioId } = Route.useParams();

  return (
    <PageLayout
      title="Studio Dashboard"
      description={`Overview and analytics for studio ${studioId}`}
    >
      <div className="space-y-6">
        <p className="text-muted-foreground">
          Dashboard content coming soon...
        </p>
      </div>
    </PageLayout>
  );
}
