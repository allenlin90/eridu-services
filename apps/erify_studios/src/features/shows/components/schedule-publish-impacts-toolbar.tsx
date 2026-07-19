import { ChevronDown, RefreshCw } from 'lucide-react';

import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@eridu/ui';
import { cn } from '@eridu/ui/lib/utils';

import { SCHEDULE_PUBLISH_IMPACTS_PAGE_SIZES } from '../config/schedule-publish-impacts-search-schema';

import {
  SchedulePublishImpactFilters,
  type SchedulePublishImpactFiltersProps,
} from './schedule-publish-impact-filters';

import * as m from '@/paraglide/messages';

export type SchedulePublishImpactsToolbarProps = SchedulePublishImpactFiltersProps & {
  pageSize: number;
  onPageSizeChange: (pageSize: number) => void;
  isFetching: boolean;
  onRefresh: () => void;
};

export function SchedulePublishImpactsToolbar({
  pageSize,
  onPageSizeChange,
  isFetching,
  onRefresh,
  ...filterProps
}: SchedulePublishImpactsToolbarProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <SchedulePublishImpactFilters {...filterProps} />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button type="button" variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
            {m.schedule_publish_impacts_rows_count({ count: pageSize })}
            <ChevronDown className="h-3.5 w-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" sideOffset={8} collisionPadding={12}>
          <DropdownMenuLabel>{m.schedule_publish_impacts_rows_per_page()}</DropdownMenuLabel>
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

      <Button
        type="button"
        variant="outline"
        size="icon"
        className="h-8 w-8"
        onClick={onRefresh}
        disabled={isFetching}
        aria-label={m.schedule_publish_impacts_refresh_label()}
      >
        <RefreshCw className={cn('h-3.5 w-3.5', isFetching && 'animate-spin')} />
      </Button>
    </div>
  );
}
