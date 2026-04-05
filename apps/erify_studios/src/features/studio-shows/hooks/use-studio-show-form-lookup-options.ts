import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';

import type { StudioShowDetail } from '@eridu/api-types/shows';

import { getClients } from '@/features/clients/api/get-clients';
import { getPlatforms } from '@/features/platforms/api/get-platforms';
import { getShowStandards } from '@/features/show-standards/api/get-show-standards';
import { getShowStatuses } from '@/features/show-statuses/api/get-show-statuses';
import { getShowTypes } from '@/features/show-types/api/get-show-types';

const LOOKUP_STALE_TIME_MS = 60 * 60 * 1000;
const DEFAULT_LOOKUP_LIMIT = 10;
const SEARCH_LOOKUP_LIMIT = 20;

type LookupOption = {
  value: string;
  label: string;
};

function withSelectedOption(
  options: LookupOption[],
  selected?: { id?: string | null; label?: string | null },
) {
  if (!selected?.id || !selected.label) {
    return options;
  }

  if (options.some((option) => option.value === selected.id)) {
    return options;
  }

  return [{ value: selected.id, label: selected.label }, ...options];
}

function withSelectedOptions(
  options: LookupOption[],
  selected: Array<{ id?: string | null; label?: string | null }>,
) {
  const nextOptions = [...options];

  selected.forEach((item) => {
    if (!item.id || !item.label || nextOptions.some((option) => option.value === item.id)) {
      return;
    }

    nextOptions.unshift({ value: item.id, label: item.label });
  });

  return nextOptions;
}

function filterOptions(options: LookupOption[], search: string) {
  const normalizedSearch = search.trim().toLowerCase();

  if (!normalizedSearch) {
    return options;
  }

  return options.filter((option) => option.label.toLowerCase().includes(normalizedSearch));
}

export function useStudioShowClientOptions(show: StudioShowDetail | null | undefined, studioId: string) {
  const [search, setSearch] = useState('');

  const query = useQuery({
    queryKey: ['studio-show-form', 'clients', studioId, { search }],
    queryFn: ({ signal }) => getClients({
      name: search || undefined,
      limit: search ? SEARCH_LOOKUP_LIMIT : DEFAULT_LOOKUP_LIMIT,
    }, studioId, { signal }),
    enabled: Boolean(studioId),
    staleTime: LOOKUP_STALE_TIME_MS,
    gcTime: 2 * 60 * 60 * 1000,
  });

  const options = useMemo(
    () =>
      withSelectedOption(
        (query.data?.data ?? []).map((client) => ({ value: client.id, label: client.name })),
        { id: show?.client_id, label: show?.client_name },
      ),
    [query.data?.data, show?.client_id, show?.client_name],
  );

  return { options, isLoading: query.isLoading || query.isFetching, setSearch };
}

export function useStudioShowTypeOptions(show: StudioShowDetail | null | undefined, studioId: string) {
  const [search, setSearch] = useState('');

  const query = useQuery({
    queryKey: ['studio-show-form', 'show-types', studioId, { search }],
    queryFn: ({ signal }) => getShowTypes({
      name: search || undefined,
      limit: search ? SEARCH_LOOKUP_LIMIT : DEFAULT_LOOKUP_LIMIT,
    }, studioId, { signal }),
    enabled: Boolean(studioId),
    staleTime: LOOKUP_STALE_TIME_MS,
    gcTime: 2 * 60 * 60 * 1000,
  });

  const options = useMemo(
    () =>
      withSelectedOption(
        (query.data?.data ?? []).map((item) => ({ value: item.id, label: item.name })),
        { id: show?.show_type_id, label: show?.show_type_name },
      ),
    [query.data?.data, show?.show_type_id, show?.show_type_name],
  );

  return { options, isLoading: query.isLoading || query.isFetching, setSearch };
}

export function useStudioShowStatusOptions(show: StudioShowDetail | null | undefined, studioId: string) {
  const [search, setSearch] = useState('');

  const query = useQuery({
    queryKey: ['studio-show-form', 'show-statuses', studioId, { search }],
    queryFn: ({ signal }) => getShowStatuses({
      name: search || undefined,
      limit: search ? SEARCH_LOOKUP_LIMIT : DEFAULT_LOOKUP_LIMIT,
    }, studioId, { signal }),
    enabled: Boolean(studioId),
    staleTime: LOOKUP_STALE_TIME_MS,
    gcTime: 2 * 60 * 60 * 1000,
  });

  const options = useMemo(
    () =>
      filterOptions(
        withSelectedOption(
          (query.data?.data ?? []).map((item) => ({ value: item.id, label: item.name })),
          { id: show?.show_status_id, label: show?.show_status_name },
        ),
        search,
      ),
    [query.data?.data, search, show?.show_status_id, show?.show_status_name],
  );

  return { options, isLoading: query.isLoading || query.isFetching, setSearch };
}

export function useStudioShowStandardOptions(show: StudioShowDetail | null | undefined, studioId: string) {
  const [search, setSearch] = useState('');

  const query = useQuery({
    queryKey: ['studio-show-form', 'show-standards', studioId, { search }],
    queryFn: ({ signal }) => getShowStandards({
      name: search || undefined,
      limit: search ? SEARCH_LOOKUP_LIMIT : DEFAULT_LOOKUP_LIMIT,
    }, studioId, { signal }),
    enabled: Boolean(studioId),
    staleTime: LOOKUP_STALE_TIME_MS,
    gcTime: 2 * 60 * 60 * 1000,
  });

  const options = useMemo(
    () =>
      withSelectedOption(
        (query.data?.data ?? []).map((item) => ({ value: item.id, label: item.name })),
        { id: show?.show_standard_id, label: show?.show_standard_name },
      ),
    [query.data?.data, show?.show_standard_id, show?.show_standard_name],
  );

  return { options, isLoading: query.isLoading || query.isFetching, setSearch };
}

export function useStudioShowPlatformOptions(show: StudioShowDetail | null | undefined, studioId: string) {
  const [search, setSearch] = useState('');

  const query = useQuery({
    queryKey: ['studio-show-form', 'platforms', studioId, { search }],
    queryFn: ({ signal }) => getPlatforms({
      name: search || undefined,
      limit: search ? SEARCH_LOOKUP_LIMIT : DEFAULT_LOOKUP_LIMIT,
    }, studioId, { signal }),
    enabled: Boolean(studioId),
    staleTime: LOOKUP_STALE_TIME_MS,
    gcTime: 2 * 60 * 60 * 1000,
  });

  const options = useMemo(
    () =>
      withSelectedOptions(
        (query.data?.data ?? []).map((platform) => ({ value: platform.id, label: platform.name })),
        (show?.platforms ?? []).map((platform) => ({ id: platform.id, label: platform.name })),
      ),
    [query.data?.data, show?.platforms],
  );

  return { options, isLoading: query.isLoading || query.isFetching, setSearch };
}
