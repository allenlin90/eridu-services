import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';

import { ShowsListPage } from '@/pages/shows/shows-list-page';

const showsSearchSchema = z.object({
  page: z.number().int().min(1).catch(1),
  pageSize: z.number().int().min(10).max(100).catch(10),
  sortBy: z.string().optional().catch(undefined),
  sortOrder: z.enum(['asc', 'desc']).optional().catch(undefined),
  search: z.string().optional().catch(undefined),
  startDate: z.string().optional().catch(undefined),
  endDate: z.string().optional().catch(undefined),
});

export const Route = createFileRoute('/shows/')({
  component: ShowsListPage,
  validateSearch: (search) => showsSearchSchema.parse(search),
});
