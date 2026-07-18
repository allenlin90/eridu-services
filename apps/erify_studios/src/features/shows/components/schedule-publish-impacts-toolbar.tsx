import { ChevronDown, RefreshCw, X } from 'lucide-react';

import type {
  ScheduleConflictResolutionStatus,
  SchedulePublishImpactKind,
} from '@eridu/api-types/shows';
import {
  Button,
  DatePicker,
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@eridu/ui';
import { cn } from '@eridu/ui/lib/utils';

import { SCHEDULE_PUBLISH_IMPACTS_PAGE_SIZES } from '../config/schedule-publish-impacts-search-schema';

import { OVERLAY_MAX_H, VIEWPORT_GUTTER_W } from '@/config/layout';

const IMPACT_KIND_OPTIONS: { value: SchedulePublishImpactKind; label: string }[] = [
  { value: 'confirmed_future_updated', label: 'Updated' },
  { value: 'confirmed_future_pending_resolution', label: 'Pending resolution' },
  { value: 'stale_conflict', label: 'Needs review' },
  { value: 'past_show_creator_backfilled', label: 'Creators backfilled' },
];

const RESOLUTION_STATUS_OPTIONS: { value: ScheduleConflictResolutionStatus; label: string }[] = [
  { value: 'pending', label: 'Pending' },
  { value: 'applied', label: 'Applied' },
  { value: 'dismissed', label: 'Dismissed' },
  { value: 'superseded', label: 'Superseded' },
  { value: 'auto_resolved_no_longer_conflicting', label: 'Auto-resolved' },
];

type DateRangeFilterProps = {
  label: string;
  from: string;
  to: string;
  onFromChange: (value: string) => void;
  onToChange: (value: string) => void;
};

function DateRangeFilter({ label, from, to, onFromChange, onToChange }: DateRangeFilterProps) {
  return (
    <div className="flex items-center gap-1">
      <span className="text-xs text-muted-foreground whitespace-nowrap">{label}</span>
      <DatePicker value={from} onChange={onFromChange} className="h-8 w-32 text-xs" />
      <span className="text-xs text-muted-foreground">–</span>
      <DatePicker value={to} onChange={onToChange} className="h-8 w-32 text-xs" />
      {(from || to) && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => {
            onFromChange('');
            onToChange('');
          }}
          title={`Clear ${label.toLowerCase()} filter`}
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      )}
    </div>
  );
}

export type SchedulePublishImpactsToolbarProps = {
  startFrom: string;
  startTo: string;
  onStartFromChange: (value: string) => void;
  onStartToChange: (value: string) => void;
  changedFrom: string;
  changedTo: string;
  onChangedFromChange: (value: string) => void;
  onChangedToChange: (value: string) => void;
  selectedImpactKinds: SchedulePublishImpactKind[];
  onToggleImpactKind: (kind: SchedulePublishImpactKind) => void;
  selectedResolutionStatuses: ScheduleConflictResolutionStatus[];
  onToggleResolutionStatus: (status: ScheduleConflictResolutionStatus) => void;
  publishRunId: string | undefined;
  onClearPublishRun: () => void;
  pageSize: number;
  onPageSizeChange: (pageSize: number) => void;
  hasActiveFilters: boolean;
  onClearFilters: () => void;
  isFetching: boolean;
  onRefresh: () => void;
};

export function SchedulePublishImpactsToolbar({
  startFrom,
  startTo,
  onStartFromChange,
  onStartToChange,
  changedFrom,
  changedTo,
  onChangedFromChange,
  onChangedToChange,
  selectedImpactKinds,
  onToggleImpactKind,
  selectedResolutionStatuses,
  onToggleResolutionStatus,
  publishRunId,
  onClearPublishRun,
  pageSize,
  onPageSizeChange,
  hasActiveFilters,
  onClearFilters,
  isFetching,
  onRefresh,
}: SchedulePublishImpactsToolbarProps) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <DateRangeFilter
          label="Show time"
          from={startFrom}
          to={startTo}
          onFromChange={onStartFromChange}
          onToChange={onStartToChange}
        />
        <DateRangeFilter
          label="Change time"
          from={changedFrom}
          to={changedTo}
          onFromChange={onChangedFromChange}
          onToChange={onChangedToChange}
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button type="button" variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
              Impact kind
              {selectedImpactKinds.length > 0 ? ` (${selectedImpactKinds.length})` : ''}
              <ChevronDown className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            sideOffset={8}
            collisionPadding={12}
            className={`${VIEWPORT_GUTTER_W} max-w-72 ${OVERLAY_MAX_H} overflow-y-auto overscroll-contain`}
          >
            <DropdownMenuLabel>Impact kind</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {IMPACT_KIND_OPTIONS.map((option) => (
              <DropdownMenuCheckboxItem
                key={option.value}
                checked={selectedImpactKinds.includes(option.value)}
                onCheckedChange={() => onToggleImpactKind(option.value)}
                onSelect={(event) => event.preventDefault()}
              >
                {option.label}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button type="button" variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
              Resolution
              {selectedResolutionStatuses.length > 0 ? ` (${selectedResolutionStatuses.length})` : ''}
              <ChevronDown className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            sideOffset={8}
            collisionPadding={12}
            className={`${VIEWPORT_GUTTER_W} max-w-72 ${OVERLAY_MAX_H} overflow-y-auto overscroll-contain`}
          >
            <DropdownMenuLabel>Resolution status</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {RESOLUTION_STATUS_OPTIONS.map((option) => (
              <DropdownMenuCheckboxItem
                key={option.value}
                checked={selectedResolutionStatuses.includes(option.value)}
                onCheckedChange={() => onToggleResolutionStatus(option.value)}
                onSelect={(event) => event.preventDefault()}
              >
                {option.label}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button type="button" variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
              {`Rows: ${pageSize}`}
              <ChevronDown className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" sideOffset={8} collisionPadding={12}>
            <DropdownMenuLabel>Rows per page</DropdownMenuLabel>
            <DropdownMenuRadioGroup
              value={String(pageSize)}
              onValueChange={(value) => onPageSizeChange(Number(value))}
            >
              {SCHEDULE_PUBLISH_IMPACTS_PAGE_SIZES.map((option) => (
                <DropdownMenuRadioItem key={option} value={String(option)}>
                  {option}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>

        {publishRunId && (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="h-8 gap-1.5 text-xs"
            onClick={onClearPublishRun}
            title="Showing impacts from one publish run — click to clear"
          >
            {`Run: ${publishRunId}`}
            <X className="h-3 w-3" />
          </Button>
        )}

        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={onRefresh}
          disabled={isFetching}
          aria-label="Refresh impacts"
        >
          <RefreshCw className={cn('h-3.5 w-3.5', isFetching && 'animate-spin')} />
        </Button>

        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground h-8 gap-1 text-xs"
            onClick={onClearFilters}
          >
            <X className="h-3 w-3" />
            Clear
          </Button>
        )}
      </div>
    </div>
  );
}
