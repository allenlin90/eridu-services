import { createFileRoute } from '@tanstack/react-router';

import { showsSearchSchema } from '@/features/shows/config/shows-search-schema';
import { ShowsListPage } from '@/pages/shows/shows-list-page';

export const Route = createFileRoute('/shows/')({
  component: ShowsListPage,
  validateSearch: (search) => showsSearchSchema.parse(search),
});
