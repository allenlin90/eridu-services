import { useQuery } from '@tanstack/react-query';
import type { z } from 'zod';

import type {
  CompensationLineItemApiResponse,
  CreateAdminCompensationLineItemInput,
  CreateStudioCompensationLineItemInput,
  listCompensationLineItemsQuerySchema,
  listStudioCompensationLineItemsQuerySchema,
  UpdateCompensationLineItemInput,
} from '@eridu/api-types/compensation-line-items';

import type { PaginatedResponse } from '@/lib/api/admin';
import { apiClient } from '@/lib/api/client';

export type AdminCompensationLineItemsResponse = PaginatedResponse<CompensationLineItemApiResponse>;
export type StudioCompensationLineItemsResponse = PaginatedResponse<CompensationLineItemApiResponse>;

export type GetAdminCompensationLineItemsParams = z.input<typeof listCompensationLineItemsQuerySchema>;
export type GetStudioCompensationLineItemsParams = z.input<typeof listStudioCompensationLineItemsQuerySchema>;

export const adminCompensationLineItemKeys = {
  all: ['compensation-line-items', 'system'] as const,
  list: (params: GetAdminCompensationLineItemsParams) =>
    [...adminCompensationLineItemKeys.all, params] as const,
  detail: (id: string) => ['compensation-line-item', id] as const,
};

export const studioCompensationLineItemKeys = {
  all: ['compensation-line-items', 'studio'] as const,
  lists: () => [...studioCompensationLineItemKeys.all, 'list'] as const,
  listPrefix: (studioId: string) => [...studioCompensationLineItemKeys.lists(), studioId] as const,
  list: (studioId: string, params: GetStudioCompensationLineItemsParams) =>
    [...studioCompensationLineItemKeys.listPrefix(studioId), params] as const,
  detail: (studioId: string, id: string) =>
    [...studioCompensationLineItemKeys.all, 'detail', studioId, id] as const,
};

export async function getAdminCompensationLineItems(
  params: GetAdminCompensationLineItemsParams,
  options?: { signal?: AbortSignal },
): Promise<AdminCompensationLineItemsResponse> {
  const response = await apiClient.get<AdminCompensationLineItemsResponse>(
    '/admin/compensation-line-items',
    {
      params,
      signal: options?.signal,
    },
  );
  return response.data;
}

export async function getAdminCompensationLineItem(
  id: string,
  options?: { signal?: AbortSignal },
): Promise<CompensationLineItemApiResponse> {
  const response = await apiClient.get<CompensationLineItemApiResponse>(
    `/admin/compensation-line-items/${id}`,
    {
      signal: options?.signal,
    },
  );
  return response.data;
}

export async function createAdminCompensationLineItem(
  data: CreateAdminCompensationLineItemInput,
): Promise<CompensationLineItemApiResponse> {
  const response = await apiClient.post<CompensationLineItemApiResponse>(
    '/admin/compensation-line-items',
    data,
  );
  return response.data;
}

export async function updateAdminCompensationLineItem(
  id: string,
  data: UpdateCompensationLineItemInput,
): Promise<CompensationLineItemApiResponse> {
  const response = await apiClient.patch<CompensationLineItemApiResponse>(
    `/admin/compensation-line-items/${id}`,
    data,
  );
  return response.data;
}

export async function deleteAdminCompensationLineItem(id: string): Promise<void> {
  await apiClient.delete(`/admin/compensation-line-items/${id}`);
}

export async function getStudioCompensationLineItems(
  studioId: string,
  params: GetStudioCompensationLineItemsParams,
  options?: { signal?: AbortSignal },
): Promise<StudioCompensationLineItemsResponse> {
  const response = await apiClient.get<StudioCompensationLineItemsResponse>(
    `/studios/${studioId}/compensation-line-items`,
    {
      params,
      signal: options?.signal,
    },
  );
  return response.data;
}

export function useStudioCompensationLineItems(
  studioId: string,
  params: GetStudioCompensationLineItemsParams,
  enabled = true,
) {
  return useQuery({
    queryKey: studioCompensationLineItemKeys.list(studioId, params),
    queryFn: ({ signal }) => getStudioCompensationLineItems(studioId, params, { signal }),
    enabled: enabled && Boolean(studioId),
  });
}

export async function createStudioCompensationLineItem(
  studioId: string,
  data: CreateStudioCompensationLineItemInput,
): Promise<CompensationLineItemApiResponse> {
  const response = await apiClient.post<CompensationLineItemApiResponse>(
    `/studios/${studioId}/compensation-line-items`,
    data,
  );
  return response.data;
}

export async function updateStudioCompensationLineItem(
  studioId: string,
  id: string,
  data: UpdateCompensationLineItemInput,
): Promise<CompensationLineItemApiResponse> {
  const response = await apiClient.patch<CompensationLineItemApiResponse>(
    `/studios/${studioId}/compensation-line-items/${id}`,
    data,
  );
  return response.data;
}

export async function deleteStudioCompensationLineItem(
  studioId: string,
  id: string,
): Promise<void> {
  await apiClient.delete(`/studios/${studioId}/compensation-line-items/${id}`);
}
