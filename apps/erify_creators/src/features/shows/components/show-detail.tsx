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

import { formatShowDate } from '@/features/shows/lib/format-show-date';
import * as m from '@/paraglide/messages.js';

type ShowDetailProps = {
  show: Show;
};

const DATE_TIME_PATTERN = 'MMM d, yyyy h:mm a';
const DATE_PATTERN = 'MMM d, yyyy';

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
                  limit: 10,
                }}
              >
                {m['shows.title']()}
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
            {m['shows.basicInformation']()}
          </h2>
          <dl className="space-y-3">
            <div className="grid grid-cols-3 gap-2">
              <dt className="text-sm font-medium text-muted-foreground">ID</dt>
              <dd className="col-span-2 text-sm font-mono">{show.id}</dd>
            </div>
            {show.show_type_name
              ? (
                  <div className="grid grid-cols-3 gap-2">
                    <dt className="text-sm font-medium text-muted-foreground">
                      {m['shows.typeLabel']()}
                    </dt>
                    <dd className="col-span-2 text-sm">{show.show_type_name}</dd>
                  </div>
                )
              : null}
            {show.show_status_name
              ? (
                  <div className="grid grid-cols-3 gap-2">
                    <dt className="text-sm font-medium text-muted-foreground">
                      {m['shows.statusLabel']()}
                    </dt>
                    <dd className="col-span-2 text-sm">{show.show_status_name}</dd>
                  </div>
                )
              : null}
            {show.show_standard_name
              ? (
                  <div className="grid grid-cols-3 gap-2">
                    <dt className="text-sm font-medium text-muted-foreground">{m['shows.standard']()}</dt>
                    <dd className="col-span-2 text-sm">{show.show_standard_name}</dd>
                  </div>
                )
              : null}
          </dl>
        </div>

        {/* Client & Studio Information */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold border-b pb-2">
            {m['shows.clientAndStudio']()}
          </h2>
          <dl className="space-y-3">
            {show.client_name
              ? (
                  <div className="grid grid-cols-3 gap-2">
                    <dt className="text-sm font-medium text-muted-foreground">{m['shows.client']()}</dt>
                    <dd className="col-span-2 text-sm">{show.client_name}</dd>
                  </div>
                )
              : null}
            {show.studio_room_name
              ? (
                  <div className="grid grid-cols-3 gap-2">
                    <dt className="text-sm font-medium text-muted-foreground">
                      {m['shows.studioRoom']()}
                    </dt>
                    <dd className="col-span-2 text-sm">{show.studio_room_name}</dd>
                  </div>
                )
              : null}
          </dl>
        </div>

        {/* Schedule Information */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold border-b pb-2">{m['shows.schedule']()}</h2>
          <dl className="space-y-3">
            {show.start_time
              ? (
                  <div className="grid grid-cols-3 gap-2">
                    <dt className="text-sm font-medium text-muted-foreground">
                      {m['shows.startLabel']()}
                    </dt>
                    <dd className="col-span-2 text-sm">
                      {formatShowDate(show.start_time, DATE_TIME_PATTERN, 'N/A')}
                    </dd>
                  </div>
                )
              : null}
            {show.end_time
              ? (
                  <div className="grid grid-cols-3 gap-2">
                    <dt className="text-sm font-medium text-muted-foreground">
                      {m['shows.endLabel']()}
                    </dt>
                    <dd className="col-span-2 text-sm">
                      {formatShowDate(show.end_time, DATE_TIME_PATTERN, 'N/A')}
                    </dd>
                  </div>
                )
              : null}
          </dl>
        </div>

        {/* Metadata */}
        {show.metadata && Object.keys(show.metadata).length > 0
          ? (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold border-b pb-2">{m['shows.metadata']()}</h2>
                <dl className="space-y-3">
                  {Object.entries(show.metadata).map(([key, value]) => (
                    <div key={key} className="grid grid-cols-3 gap-2">
                      <dt className="text-sm font-medium text-muted-foreground wrap-break-word">
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
            )
          : null}
      </div>

      {/* System Information */}
      <div className="border-t pt-4">
        <dl className="grid grid-cols-2 gap-4 text-sm text-muted-foreground md:grid-cols-4">
          <div>
            <dt className="font-medium">{m['shows.createdLabel']()}</dt>
            <dd>{formatShowDate(show.created_at, DATE_PATTERN, 'N/A')}</dd>
          </div>
          <div>
            <dt className="font-medium">{m['shows.updatedLabel']()}</dt>
            <dd>{formatShowDate(show.updated_at, DATE_PATTERN, 'N/A')}</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
