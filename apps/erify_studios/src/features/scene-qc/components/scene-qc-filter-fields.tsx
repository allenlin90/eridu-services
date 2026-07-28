import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useDebounceCallback } from 'usehooks-ts';

import type { SceneQcReviewState } from '@eridu/api-types/scene-qc';
import {
  AsyncCombobox,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@eridu/ui';

import { useSceneProfileClientOptions } from '../hooks/use-scene-profile-client-options';

import { getPlatforms } from '@/features/platforms/api/get-platforms';

type SceneQcFilterFieldsProps = {
  studioId: string;
  clientId?: string;
  platformId?: string;
  reviewState: SceneQcReviewState;
  search?: string;
  onClientChange: (value?: string) => void;
  onPlatformChange: (value?: string) => void;
  onReviewStateChange: (value: SceneQcReviewState) => void;
  onSearchChange: (value?: string) => void;
};

const REVIEW_STATE_OPTIONS: Array<{ value: SceneQcReviewState; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'unreviewed', label: 'Unreviewed' },
  { value: 'reviewed', label: 'Reviewed' },
  { value: 'blocked', label: 'Blocked' },
];

/** §7.2 (4): compact filter row -- Client async combobox, platform select, review-state select, search input. */
export function SceneQcFilterFields({
  studioId,
  clientId,
  platformId,
  reviewState,
  search,
  onClientChange,
  onPlatformChange,
  onReviewStateChange,
  onSearchChange,
}: SceneQcFilterFieldsProps) {
  const { clientOptions, isLoading: isClientsLoading, setClientSearch } = useSceneProfileClientOptions(studioId, clientId);
  const platforms = useQuery({
    queryKey: ['scene-qc-platform-options', studioId],
    queryFn: ({ signal }) => getPlatforms({ limit: 50 }, studioId, { signal }),
    staleTime: 60 * 60 * 1000,
  });
  const [searchValue, setSearchValue] = useState(search ?? '');
  const debouncedSearchChange = useDebounceCallback((value: string) => {
    onSearchChange(value.trim() || undefined);
  }, 300);

  return (
    <div className="flex flex-wrap items-end gap-3">
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
        <Label>Status</Label>
        <Select value={reviewState} onValueChange={(value) => onReviewStateChange(value as SceneQcReviewState)}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {REVIEW_STATE_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="min-w-48 flex-1 space-y-1.5">
        <Label>Search</Label>
        <Input
          value={searchValue}
          onChange={(event) => {
            setSearchValue(event.target.value);
            debouncedSearchChange(event.target.value);
          }}
          placeholder="Search by Show name"
        />
      </div>
    </div>
  );
}
