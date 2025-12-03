import { LoadingPage } from '@eridu/ui';

import { useShow } from '@/features/shows/api';
import { ShowDetailView } from '@/features/shows/components/show-detail';
import * as m from '@/paraglide/messages.js';

type ShowDetailPageProps = {
  showId: string;
};

/**
 * Show Detail Page Component
 *
 * Handles page-level concerns:
 * - Data fetching for specific show via TanStack Query
 * - Error handling
 * - Page structure and layout
 * - SEO metadata (when needed)
 */
export function ShowDetailPage({ showId }: ShowDetailPageProps) {
  const { data: show, isLoading, error } = useShow(showId);

  if (isLoading) {
    return <LoadingPage />;
  }

  if (error) {
    return (
      <div className="p-4">
        <div className="bg-red-50 border border-red-200 rounded p-4">
          <h3 className="font-semibold text-red-800">{m['pages.error']()}</h3>
          <p className="text-red-600 mt-1">{m['pages.failedToLoadShowDetails']()}</p>
        </div>
      </div>
    );
  }

  if (!show) {
    return (
      <div className="p-4">
        <h1 className="text-2xl font-bold">{m['pages.showNotFound']()}</h1>
        <p className="mt-2 text-gray-600">
          {m['pages.showNotFoundMessage']({ showId })}
        </p>
      </div>
    );
  }

  return (
    <div>
      <ShowDetailView show={show} />
    </div>
  );
}
