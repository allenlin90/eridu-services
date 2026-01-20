import { keepPreviousData, useQuery } from '@tanstack/react-query';

import type { UserApiResponse } from '@eridu/api-types/users';

import type { PaginatedResponse } from '@/lib/api/admin';
import { apiClient } from '@/lib/api/client';

export type User = UserApiResponse;
export type UsersResponse = PaginatedResponse<User>;

export type GetUsersParams = {
  page?: number;
  limit?: number;
  name?: string;
  email?: string;
  id?: string;
  ext_id?: string;
};

export async function getUsers(params: GetUsersParams): Promise<UsersResponse> {
  const response = await apiClient.get<UsersResponse>('/admin/users', { params });
  return response.data;
}

export function useUsersQuery(params: GetUsersParams) {
  return useQuery({
    queryKey: ['users', 'list', params],
    queryFn: () => getUsers(params),
    staleTime: 5 * 60 * 1000,
    placeholderData: keepPreviousData,
  });
}
