import { PageContainer } from '@/components/layouts/page-container';
import { PageLayout } from '@/components/layouts/page-layout';
import { CompensationsDataPanel } from '@/features/compensations/components/compensations-data-panel';
import { CompensationsSummaryCards } from '@/features/compensations/components/compensations-summary-cards';
import { CompensationsToolbar } from '@/features/compensations/components/compensations-toolbar';
import type { MyCompensationsViewModel } from '@/features/compensations/hooks/use-my-compensations-view-model';
import * as m from '@/paraglide/messages.js';

export function MyCompensationsView({
  description,
  toolbar,
  summary,
  panel,
  shows,
}: MyCompensationsViewModel) {
  return (
    <PageContainer>
      <PageLayout title={m['compensations.title']()} description={description}>
        <div className="space-y-6">
          <CompensationsToolbar {...toolbar} />
          <CompensationsSummaryCards {...summary} />
          <CompensationsDataPanel {...panel} shows={shows} />
        </div>
      </PageLayout>
    </PageContainer>
  );
}
