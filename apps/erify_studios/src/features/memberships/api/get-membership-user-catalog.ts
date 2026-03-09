import { useQuery } from '@tanstack/react-query';

import { apiClient } from '@/lib/api/client';

export type MembershipUserCatalogItem = {
  id: string;
  ext_id: string | null;
  email: string;
  name: string;
};

async function getMembershipUserCatalog(
  studioId: string,
  search: string,
  limit: number,
): Promise<MembershipUserCatalogItem[]> {
  const response = await apiClient.get<MembershipUserCatalogItem[]>(
    `/studios/${studioId}/studio-memberships/user-catalog`,
    {
      params: {
        search: search || undefined,
        limit,
      },
    },
  );
  return response.data;
}

export function useMembershipUserCatalog(
  studioId: string,
  search: string,
  {
    enabled = true,
    limit = 20,
  }: {
    enabled?: boolean;
    limit?: number;
  } = {},
) {
  return useQuery({
    queryKey: ['studio-memberships', 'user-catalog', studioId, search, limit],
    queryFn: () => getMembershipUserCatalog(studioId, search, limit),
    enabled,
  });
}
