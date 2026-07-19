import { format, parse } from 'date-fns';
import { Filter, RotateCcw, X } from 'lucide-react';
import { useState } from 'react';
import type { DateRange } from 'react-day-picker';

import type {
  ScheduleConflictResolutionStatus,
  SchedulePublishImpactKind,
} from '@eridu/api-types/shows';
import {
  Badge,
  Button,
  Checkbox,
  DatePickerWithRange,
  Label,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@eridu/ui';
import { cn } from '@eridu/ui/lib/utils';

import { OVERLAY_MAX_H, VIEWPORT_GUTTER_W } from '@/config/layout';
import * as m from '@/paraglide/messages';

type FilterOption<T extends string> = {
  value: T;
  label: () => string;
};

const IMPACT_KIND_OPTIONS: FilterOption<SchedulePublishImpactKind>[] = [
  { value: 'confirmed_future_updated', label: m.schedule_publish_impacts_filter_kind_updated },
  {
    value: 'confirmed_future_pending_resolution',
    label: m.schedule_publish_impacts_filter_kind_pending_resolution,
  },
  { value: 'stale_conflict', label: m.schedule_publish_impacts_filter_kind_needs_review },
  {
    value: 'past_show_creator_backfilled',
    label: m.schedule_publish_impacts_filter_kind_creators_backfilled,
  },
];

const RESOLUTION_STATUS_OPTIONS: FilterOption<ScheduleConflictResolutionStatus>[] = [
  { value: 'pending', label: m.schedule_publish_impacts_filter_resolution_pending },
  { value: 'applied', label: m.schedule_publish_impacts_filter_resolution_applied },
  { value: 'dismissed', label: m.schedule_publish_impacts_filter_resolution_dismissed },
  { value: 'superseded', label: m.schedule_publish_impacts_filter_resolution_superseded },
  {
    value: 'auto_resolved_no_longer_conflicting',
    label: m.schedule_publish_impacts_filter_resolution_auto_resolved,
  },
];

function fromDateInput(value: string): Date | undefined {
  return value ? parse(value, 'yyyy-MM-dd', new Date()) : undefined;
}

function toDateInput(date: Date | undefined): string {
  return date ? format(date, 'yyyy-MM-dd') : '';
}

type DateRangeFilterProps = {
  id: string;
  label: string;
  placeholder: string;
  from: string;
  to: string;
  onChange: (from: string, to: string) => void;
};

function DateRangeFilter({
  id,
  label,
  placeholder,
  from,
  to,
  onChange,
}: DateRangeFilterProps) {
  const date: DateRange | undefined = from || to
    ? { from: fromDateInput(from), to: fromDateInput(to) }
    : undefined;

  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-xs font-normal">
        {label}
      </Label>
      <div className="flex items-center gap-2">
        <DatePickerWithRange
          id={id}
          placeholder={placeholder}
          formatEndOnlyLabel={(endDate) => m.schedule_publish_impacts_filter_until_date({
            date: format(endDate, 'LLL dd, y'),
          })}
          className="min-w-0 flex-1"
          date={date}
          setDate={(nextRange) => {
            onChange(toDateInput(nextRange?.from), toDateInput(nextRange?.to));
          }}
        />
        {from || to
          ? (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-9 w-9 shrink-0"
                onClick={() => onChange('', '')}
                aria-label={m.schedule_publish_impacts_filter_clear_range({ label })}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            )
          : null}
      </div>
    </div>
  );
}

function CheckboxFilterGroup<T extends string>({
  idPrefix,
  label,
  options,
  selected,
  onToggle,
}: {
  idPrefix: string;
  label: string;
  options: FilterOption<T>[];
  selected: T[];
  onToggle: (value: T) => void;
}) {
  return (
    <fieldset className="space-y-2">
      <legend className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        {label}
      </legend>
      <div className="grid gap-2 sm:grid-cols-2">
        {options.map((option) => {
          const id = `${idPrefix}-${option.value}`;
          return (
            <div key={option.value} className="flex items-center gap-2">
              <Checkbox
                id={id}
                checked={selected.includes(option.value)}
                onCheckedChange={() => onToggle(option.value)}
              />
              <Label htmlFor={id} className="cursor-pointer text-sm font-normal leading-none">
                {option.label()}
              </Label>
            </div>
          );
        })}
      </div>
    </fieldset>
  );
}

export type SchedulePublishImpactFiltersProps = {
  startFrom: string;
  startTo: string;
  onStartRangeChange: (from: string, to: string) => void;
  changedFrom: string;
  changedTo: string;
  onChangedRangeChange: (from: string, to: string) => void;
  selectedImpactKinds: SchedulePublishImpactKind[];
  onToggleImpactKind: (kind: SchedulePublishImpactKind) => void;
  selectedResolutionStatuses: ScheduleConflictResolutionStatus[];
  onToggleResolutionStatus: (status: ScheduleConflictResolutionStatus) => void;
  publishRunId: string | undefined;
  onClearPublishRun: () => void;
  onClearFilters: () => void;
};

type FilterPanelProps = SchedulePublishImpactFiltersProps & {
  hasActiveFilters: boolean;
  onClose: () => void;
};

function FilterPanel({
  startFrom,
  startTo,
  onStartRangeChange,
  changedFrom,
  changedTo,
  onChangedRangeChange,
  selectedImpactKinds,
  onToggleImpactKind,
  selectedResolutionStatuses,
  onToggleResolutionStatus,
  publishRunId,
  onClearPublishRun,
  onClearFilters,
  hasActiveFilters,
  onClose,
}: FilterPanelProps) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="space-y-5 overflow-y-auto overscroll-contain p-4">
        <DateRangeFilter
          id="schedule-impact-show-time-range"
          label={m.schedule_publish_impacts_filter_show_time()}
          placeholder={m.schedule_publish_impacts_filter_show_time_placeholder()}
          from={startFrom}
          to={startTo}
          onChange={onStartRangeChange}
        />
        <DateRangeFilter
          id="schedule-impact-change-time-range"
          label={m.schedule_publish_impacts_filter_change_time()}
          placeholder={m.schedule_publish_impacts_filter_change_time_placeholder()}
          from={changedFrom}
          to={changedTo}
          onChange={onChangedRangeChange}
        />

        <CheckboxFilterGroup
          idPrefix="schedule-impact-kind"
          label={m.schedule_publish_impacts_filter_impact_kind()}
          options={IMPACT_KIND_OPTIONS}
          selected={selectedImpactKinds}
          onToggle={onToggleImpactKind}
        />
        <CheckboxFilterGroup
          idPrefix="schedule-impact-resolution"
          label={m.schedule_publish_impacts_filter_resolution_status()}
          options={RESOLUTION_STATUS_OPTIONS}
          selected={selectedResolutionStatuses}
          onToggle={onToggleResolutionStatus}
        />

        {publishRunId
          ? (
              <div className="space-y-1.5">
                <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  {m.schedule_publish_impacts_filter_publish_run()}
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="h-8 max-w-full gap-1.5 text-xs"
                  onClick={onClearPublishRun}
                  title={m.schedule_publish_impacts_filter_clear_publish_run()}
                >
                  <span className="truncate">{publishRunId}</span>
                  <X className="h-3 w-3 shrink-0" />
                </Button>
              </div>
            )
          : null}
      </div>

      <div className="flex items-center justify-between gap-2 border-t p-3">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-muted-foreground"
          disabled={!hasActiveFilters}
          onClick={() => {
            onClearFilters();
            onClose();
          }}
        >
          <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
          {m.schedule_publish_impacts_filter_reset()}
        </Button>
        <Button type="button" size="sm" onClick={onClose}>
          {m.schedule_publish_impacts_filter_done()}
        </Button>
      </div>
    </div>
  );
}

export function SchedulePublishImpactFilters(props: SchedulePublishImpactFiltersProps) {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const {
    startFrom,
    startTo,
    changedFrom,
    changedTo,
    selectedImpactKinds,
    selectedResolutionStatuses,
    publishRunId,
  } = props;
  const activeFilterCount = [
    Boolean(startFrom || startTo),
    Boolean(changedFrom || changedTo),
    selectedImpactKinds.length > 0,
    selectedResolutionStatuses.length > 0,
    Boolean(publishRunId),
  ].filter(Boolean).length;
  const hasActiveFilters = activeFilterCount > 0;

  const trigger = (className: string) => (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className={cn('h-8 gap-1.5 border-dashed text-xs', hasActiveFilters && 'border-primary', className)}
    >
      <Filter className="h-3.5 w-3.5" />
      {m.schedule_publish_impacts_filters()}
      {hasActiveFilters
        ? (
            <Badge variant="secondary" className="h-5 min-w-5 px-1.5 text-xs">
              {activeFilterCount}
            </Badge>
          )
        : null}
    </Button>
  );

  return (
    <>
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetTrigger asChild>{trigger('sm:hidden')}</SheetTrigger>
        <SheetContent
          side="bottom"
          className="flex h-[min(90dvh,46rem)] flex-col rounded-t-xl p-0"
        >
          <SheetHeader className="border-b px-4 py-3 text-left">
            <SheetTitle>{m.schedule_publish_impacts_filters()}</SheetTitle>
            <SheetDescription>
              {m.schedule_publish_impacts_filters_description()}
            </SheetDescription>
          </SheetHeader>
          <FilterPanel
            {...props}
            hasActiveFilters={hasActiveFilters}
            onClose={() => setIsSheetOpen(false)}
          />
        </SheetContent>
      </Sheet>

      <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
        <PopoverTrigger asChild>{trigger('hidden sm:inline-flex')}</PopoverTrigger>
        <PopoverContent
          align="start"
          sideOffset={8}
          collisionPadding={12}
          className={`${VIEWPORT_GUTTER_W} flex w-96 max-w-96 flex-col p-0 ${OVERLAY_MAX_H}`}
        >
          <div className="border-b px-4 py-3">
            <div className="text-sm font-medium">{m.schedule_publish_impacts_filters()}</div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {m.schedule_publish_impacts_filters_description()}
            </p>
          </div>
          <FilterPanel
            {...props}
            hasActiveFilters={hasActiveFilters}
            onClose={() => setIsPopoverOpen(false)}
          />
        </PopoverContent>
      </Popover>
    </>
  );
}
