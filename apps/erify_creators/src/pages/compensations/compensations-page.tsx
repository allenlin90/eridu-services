import { MyCompensationsView } from '@/features/compensations/components/my-compensations-view';
import { useMyCompensationsViewModel } from '@/features/compensations/hooks/use-my-compensations-view-model';

export function CompensationsPage() {
  const viewModel = useMyCompensationsViewModel();
  return <MyCompensationsView {...viewModel} />;
}
