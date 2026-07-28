import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import type { DateRange } from 'react-day-picker';

import type { SceneQcResult } from '@eridu/api-types/scene-qc';
import {
  AsyncCombobox,
  DatePickerWithRange,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@eridu/ui';

import { useSceneProfileClientOptions } from '../hooks/use-scene-profile-client-options';

import { getPlatforms } from '@/features/platforms/api/get-platforms';

type SceneQcRecordsFiltersProps = {
  studioId: string;
  dateFrom: string;
  dateTo: string;
  clientId?: string;
  platformId?: string;
  result?: SceneQcResult;
  onDateRangeChange: (range: { date_from: string; date_to: string }) => void;
  onClientChange: (value?: string) => void;
  onPlatformChange: (value?: string) => void;
  onResultChange: (value?: SceneQcResult) => void;
};

const RESULT_OPTIONS: Array<{ value: SceneQcResult; label: string }> = [
  { value: 'PASS', label: 'Pass' },
  { value: 'MINOR', label: 'Minor' },
  { value: 'FAIL', label: 'Fail' },
];

function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** §7.5: date-range picker + Client async combobox + platform/result selects. */
export function SceneQcRecordsFilters({
  studioId,
  dateFrom,
  dateTo,
  clientId,
  platformId,
  result,
  onDateRangeChange,
  onClientChange,
  onPlatformChange,
  onResultChange,
}: SceneQcRecordsFiltersProps) {
  const { clientOptions, isLoading: isClientsLoading, setClientSearch } = useSceneProfileClientOptions(studioId, clientId);
  const platforms = useQuery({
    queryKey: ['scene-qc-records-platform-options', studioId],
    queryFn: ({ signal }) => getPlatforms({ limit: 50 }, studioId, { signal }),
    staleTime: 60 * 60 * 1000,
  });
  const [rangeOpen, setRangeOpen] = useState(false);
  const range: DateRange = { from: new Date(`${dateFrom}T00:00:00.000Z`), to: new Date(`${dateTo}T00:00:00.000Z`) };

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="min-w-64 space-y-1.5">
        <Label>Date range</Label>
        <DatePickerWithRange
          date={range}
          open={rangeOpen}
          onOpenChange={setRangeOpen}
          setDate={(next) => {
            if (next?.from && next?.to) {
              onDateRangeChange({ date_from: toDateKey(next.from), date_to: toDateKey(next.to) });
              setRangeOpen(false);
            }
          }}
        />
      </div>
      <div className="min-w-48 space-y-1.5">
        <Label>Client</Label>
        <AsyncCombobox
          value={clientId ?? ''}
          onChange={(value) => onClientChange(value || undefined)}
          onSearch={setClientSearch}
          options={clientOptions}
          isLoading={isClientsLoading}
          placeholder="All clients"
        />
      </div>
      <div className="min-w-40 space-y-1.5">
        <Label>Platform</Label>
        <Select value={platformId ?? 'all'} onValueChange={(value) => onPlatformChange(value === 'all' ? undefined : value)}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="All platforms" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All platforms</SelectItem>
            {(platforms.data?.data ?? []).map((platform) => (
              <SelectItem key={platform.id} value={platform.id}>{platform.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="min-w-40 space-y-1.5">
        <Label>Result</Label>
        <Select value={result ?? 'all'} onValueChange={(value) => onResultChange(value === 'all' ? undefined : value as SceneQcResult)}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="All results" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All results</SelectItem>
            {RESULT_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
