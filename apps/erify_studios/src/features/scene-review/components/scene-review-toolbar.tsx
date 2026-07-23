import { Filter, RefreshCw, RotateCcw, Search } from 'lucide-react';
import { useState } from 'react';
import type { DateRange } from 'react-day-picker';
import { useDebounceCallback } from 'usehooks-ts';

import type { SceneReviewMode } from '@eridu/api-types/task-management';
import {
  Badge,
  Button,
  DatePickerWithRange,
  Input,
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

import { SceneReviewFilterFields } from './scene-review-filter-fields';

import * as m from '@/paraglide/messages';

type SceneReviewToolbarProps = {
  studioId: string;
  mode: SceneReviewMode;
  dateRange: DateRange;
  clientId?: string;
  platformId?: string;
  search?: string;
  isRefreshing: boolean;
  onModeChange: (mode: SceneReviewMode) => void;
  onDateRangeChange: (range: DateRange | undefined) => void;
  onClientChange: (value?: string) => void;
  onPlatformChange: (value?: string) => void;
  onSearchChange: (value?: string) => void;
  onRefresh: () => void;
};

type SceneReviewSearchInputProps = {
  initialValue?: string;
  onSearchChange: (value?: string) => void;
};

function SceneReviewSearchInput({
  initialValue,
  onSearchChange,
}: SceneReviewSearchInputProps) {
  const [value, setValue] = useState(initialValue ?? '');
  const updateSearch = useDebounceCallback((nextValue: string) => {
    onSearchChange(nextValue.trim() || undefined);
  }, 300);

  return (
    <div className="relative min-w-48 flex-1 sm:max-w-xs">
      <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
      <Input
        value={value}
        onChange={(event) => {
          setValue(event.target.value);
          updateSearch(event.target.value);
        }}
        placeholder={m.scene_review_search_placeholder()}
        className="pl-9"
      />
    </div>
  );
}

export function SceneReviewToolbar({
  studioId,
  mode,
  dateRange,
  clientId,
  platformId,
  search,
  isRefreshing,
  onModeChange,
  onDateRangeChange,
  onClientChange,
  onPlatformChange,
  onSearchChange,
  onRefresh,
}: SceneReviewToolbarProps) {
  const [filterPopoverOpen, setFilterPopoverOpen] = useState(false);
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const activeFilterCount = Number(Boolean(clientId)) + Number(Boolean(platformId));

  const filterFields = (
    <SceneReviewFilterFields
      studioId={studioId}
      clientId={clientId}
      platformId={platformId}
      onClientChange={onClientChange}
      onPlatformChange={onPlatformChange}
    />
  );
  const resetSecondary = () => {
    onClientChange(undefined);
    onPlatformChange(undefined);
  };
  const filterButton = (className: string) => (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className={cn('gap-2 border-dashed', activeFilterCount > 0 && 'border-primary', className)}
    >
      <Filter className="h-4 w-4" />
      {m.scene_review_filters()}
      {activeFilterCount > 0 ? <Badge variant="secondary">{activeFilterCount}</Badge> : null}
    </Button>
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex rounded-md border bg-muted/30 p-1">
          <Button
            type="button"
            size="sm"
            variant={mode === 'analysis' ? 'secondary' : 'ghost'}
            onClick={() => onModeChange('analysis')}
          >
            {m.scene_review_analysis()}
          </Button>
          <Button
            type="button"
            size="sm"
            variant={mode === 'qc-inbox' ? 'secondary' : 'ghost'}
            onClick={() => onModeChange('qc-inbox')}
          >
            {m.scene_review_qc_inbox()}
          </Button>
        </div>
        <DatePickerWithRange
          className="w-full sm:w-72"
          date={dateRange}
          setDate={onDateRangeChange}
        />
        <SceneReviewSearchInput
          key={search ?? ''}
          initialValue={search}
          onSearchChange={onSearchChange}
        />

        <Sheet open={filterSheetOpen} onOpenChange={setFilterSheetOpen}>
          <SheetTrigger asChild>{filterButton('sm:hidden')}</SheetTrigger>
          <SheetContent side="bottom" className="max-h-[85dvh] rounded-t-xl p-0">
            <SheetHeader className="border-b px-4 py-3 text-left">
              <SheetTitle>{m.scene_review_filters()}</SheetTitle>
              <SheetDescription>{m.scene_review_filters_description()}</SheetDescription>
            </SheetHeader>
            {filterFields}
          </SheetContent>
        </Sheet>

        <Popover open={filterPopoverOpen} onOpenChange={setFilterPopoverOpen}>
          <PopoverTrigger asChild>{filterButton('hidden sm:inline-flex')}</PopoverTrigger>
          <PopoverContent align="end" className="w-80 p-0">
            <div className="flex items-center justify-between border-b px-4 py-3">
              <span className="text-sm font-medium">{m.scene_review_filters()}</span>
              {activeFilterCount > 0
                ? (
                    <Button type="button" variant="ghost" size="sm" onClick={resetSecondary}>
                      <RotateCcw className="mr-1 h-3.5 w-3.5" />
                      {m.scene_review_reset()}
                    </Button>
                  )
                : null}
            </div>
            {filterFields}
          </PopoverContent>
        </Popover>

        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={onRefresh}
          disabled={isRefreshing}
          aria-label={m.scene_review_refresh()}
        >
          <RefreshCw className={cn('h-4 w-4', isRefreshing && 'animate-spin')} />
        </Button>
      </div>
    </div>
  );
}
