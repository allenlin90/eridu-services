import { useMemo } from 'react';

import { useStudioMembershipsQuery } from '@/features/memberships/api/get-studio-memberships';

export type StudioMemberInfo = {
  name: string;
  email: string;
};

type UseStudioMemberMapOptions = {
  enabled?: boolean;
  limit?: number;
};

export function useStudioMemberMap(studioId: string, options?: UseStudioMemberMapOptions) {
  const { data, isLoading } = useStudioMembershipsQuery(
    studioId,
    { page: 1, limit: options?.limit ?? 200 },
    { enabled: options?.enabled ?? true },
  );

  const members = useMemo(() => data?.data ?? [], [data?.data]);
  const memberMap = useMemo(() => {
    return new Map(
      members.map((member) => [
        member.user.id,
        {
          name: member.user.name,
          email: member.user.email,
        },
      ]),
    );
  }, [members]);

  return {
    members,
    memberMap,
    isLoading,
  };
}
