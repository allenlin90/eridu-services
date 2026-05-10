import type { z } from 'zod';

import type {
  CompensationLineItemApiResponse,
  CreateAdminCompensationLineItemInput,
  listCompensationLineItemsQuerySchema,
  UpdateCompensationLineItemInput,
} from '@eridu/api-types/compensation-line-items';

import type { PaginatedResponse } from '@/lib/api/admin';
import { apiClient } from '@/lib/api/client';

export type AdminCompensationLineItemsResponse = PaginatedResponse<CompensationLineItemApiResponse>;

export type GetAdminCompensationLineItemsParams = z.input<typeof listCompensationLineItemsQuerySchema>;

export const adminCompensationLineItemKeys = {
  all: ['compensation-line-items', 'system'] as const,
  list: (params: GetAdminCompensationLineItemsParams) =>
    [...adminCompensationLineItemKeys.all, params] as const,
  detail: (id: string) => ['compensation-line-item', id] as const,
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
