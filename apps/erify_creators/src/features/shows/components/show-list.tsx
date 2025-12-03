import { LoadingSpinner } from '@eridu/ui';

import type { Show } from '../types';

import * as m from '@/paraglide/messages.js';

type ShowListProps = {
  shows: Show[];
  isLoading?: boolean;
};

export function ShowList({ shows, isLoading }: ShowListProps) {
  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (shows.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500">
        <p>{m['shows.noShows']()}</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 p-4 md:grid-cols-2 lg:grid-cols-3">
      {shows.map((show) => (
        <div
          key={show.id}
          className="rounded-lg border border-gray-200 p-4 shadow-sm hover:shadow-md"
        >
          <h3 className="text-lg font-semibold">{show.name}</h3>
          {show.showTypeName && (
            <p className="mt-2 text-sm text-gray-600">
              {m['shows.typeLabel']()}
              {' '}
              {show.showTypeName}
            </p>
          )}
          {show.startTime && (
            <p className="mt-1 text-xs text-gray-500">
              {new Date(show.startTime).toLocaleString()}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
