import { createFileRoute } from '@tanstack/react-router';

import { compensationsSearchSchema } from '@/features/compensations/config/compensations-search-schema';
import { CompensationsPage } from '@/pages/compensations/compensations-page';

export const Route = createFileRoute('/compensations/')({
  component: CompensationsPage,
  validateSearch: (search) => compensationsSearchSchema.parse(search),
});
