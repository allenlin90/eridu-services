import { useQuery } from '@tanstack/react-query';

import type { MembershipApiResponse } from '@eridu/api-types/memberships';

import type { PaginatedResponse } from '@/lib/api/admin';
import { apiClient } from '@/lib/api/client';

export type Membership = MembershipApiResponse & {
  user: {
    id: string; // user uid
    email: string;
    name: string;
  };
  studio: {
    id: string; // studio uid
    name: string;
  };
};
export type MembershipsResponse = PaginatedResponse<Membership>;

export type GetMembershipsParams = {
  page?: number;
  limit?: number;
  name?: string;
  id?: string;
  studio_id?: string;
};

export async function getMemberships(params: GetMembershipsParams): Promise<MembershipsResponse> {
  const response = await apiClient.get<MembershipsResponse>('/admin/studio-memberships', { params });
  return response.data;
}

export function useMembershipsQuery(params: GetMembershipsParams) {
  return useQuery({
    queryKey: ['memberships', 'list', params],
    queryFn: () => getMemberships(params),
    placeholderData: (previousData: MembershipsResponse | undefined) => previousData,
  });
}
