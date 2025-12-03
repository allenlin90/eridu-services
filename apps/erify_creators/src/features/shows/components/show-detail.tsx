import { Link } from '@tanstack/react-router';

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@eridu/ui';

import type { Show } from '../types';

import * as m from '@/paraglide/messages.js';

type ShowDetailProps = {
  show: Show;
};

const dateTimeFormatter = new Intl.DateTimeFormat('en-US', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

const dateFormatter = new Intl.DateTimeFormat('en-US', {
  dateStyle: 'medium',
});

/**
 * Safely format a date string, returning a fallback if invalid
 */
function formatDate(
  dateString: string | null | undefined,
  formatter: Intl.DateTimeFormat,
  fallback = 'N/A',
): string {
  if (!dateString)
    return fallback;
  try {
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime()))
      return fallback;
    return formatter.format(date);
  } catch {
    return fallback;
  }
}

export function ShowDetailView({ show }: ShowDetailProps) {
  return (
    <div className="space-y-6 p-4">
      {/* Breadcrumb Navigation */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link
                to="/shows"
                search={{
                  page: 1,
                  pageSize: 10,
                }}
              >
                Shows
              </Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{show.name}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Show Title */}
      <div>
        <h1 className="text-3xl font-bold">{show.name}</h1>
      </div>

      {/* Show Details - Responsive Grid Layout */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Basic Information */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold border-b pb-2">
            Basic Information
          </h2>
          <dl className="space-y-3">
            <div className="grid grid-cols-3 gap-2">
              <dt className="text-sm font-medium text-gray-600">ID</dt>
              <dd className="col-span-2 text-sm font-mono">{show.id}</dd>
            </div>
            {show.show_type_name && (
              <div className="grid grid-cols-3 gap-2">
                <dt className="text-sm font-medium text-gray-600">
                  {m['shows.typeLabel']()}
                </dt>
                <dd className="col-span-2 text-sm">{show.show_type_name}</dd>
              </div>
            )}
            {show.show_status_name && (
              <div className="grid grid-cols-3 gap-2">
                <dt className="text-sm font-medium text-gray-600">
                  {m['shows.statusLabel']()}
                </dt>
                <dd className="col-span-2 text-sm">{show.show_status_name}</dd>
              </div>
            )}
            {show.show_standard_name && (
              <div className="grid grid-cols-3 gap-2">
                <dt className="text-sm font-medium text-gray-600">Standard</dt>
                <dd className="col-span-2 text-sm">{show.show_standard_name}</dd>
              </div>
            )}
          </dl>
        </div>

        {/* Client & Studio Information */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold border-b pb-2">
            Client & Studio
          </h2>
          <dl className="space-y-3">
            {show.client_name && (
              <div className="grid grid-cols-3 gap-2">
                <dt className="text-sm font-medium text-gray-600">Client</dt>
                <dd className="col-span-2 text-sm">{show.client_name}</dd>
              </div>
            )}
            {show.studio_room_name && (
              <div className="grid grid-cols-3 gap-2">
                <dt className="text-sm font-medium text-gray-600">
                  Studio Room
                </dt>
                <dd className="col-span-2 text-sm">{show.studio_room_name}</dd>
              </div>
            )}
          </dl>
        </div>

        {/* Schedule Information */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold border-b pb-2">Schedule</h2>
          <dl className="space-y-3">
            {show.start_time && (
              <div className="grid grid-cols-3 gap-2">
                <dt className="text-sm font-medium text-gray-600">
                  {m['shows.startLabel']()}
                </dt>
                <dd className="col-span-2 text-sm">
                  {formatDate(show.start_time, dateTimeFormatter)}
                </dd>
              </div>
            )}
            {show.end_time && (
              <div className="grid grid-cols-3 gap-2">
                <dt className="text-sm font-medium text-gray-600">
                  {m['shows.endLabel']()}
                </dt>
                <dd className="col-span-2 text-sm">
                  {formatDate(show.end_time, dateTimeFormatter)}
                </dd>
              </div>
            )}
          </dl>
        </div>

        {/* Metadata */}
        {show.metadata && Object.keys(show.metadata).length > 0 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold border-b pb-2">Metadata</h2>
            <dl className="space-y-3">
              {Object.entries(show.metadata).map(([key, value]) => (
                <div key={key} className="grid grid-cols-3 gap-2">
                  <dt className="text-sm font-medium text-gray-600 wrap-break-word">
                    {key}
                  </dt>
                  <dd className="col-span-2 text-sm wrap-break-word">
                    {typeof value === 'object'
                      ? JSON.stringify(value, null, 2)
                      : String(value)}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        )}
      </div>

      {/* System Information */}
      <div className="border-t pt-4">
        <dl className="grid grid-cols-2 gap-4 text-sm text-gray-500 md:grid-cols-4">
          <div>
            <dt className="font-medium">{m['shows.createdLabel']()}</dt>
            <dd>{formatDate(show.created_at, dateFormatter)}</dd>
          </div>
          <div>
            <dt className="font-medium">{m['shows.updatedLabel']()}</dt>
            <dd>{formatDate(show.updated_at, dateFormatter)}</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
