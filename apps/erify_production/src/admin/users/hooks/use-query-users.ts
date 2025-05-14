import { useUserSearchParams } from "@/admin/users/hooks/use-user-search-params";
import { usePaginationParams } from "@/hooks/use-pagination-params";
import { useSession } from "@eridu/auth-service/hooks/use-session";
import { useQuery } from "@tanstack/react-query";

export const useQueryUsers = () => {
  const { authClient } = useSession();
  const { params: paginationParams } = usePaginationParams();
  const { params: userSearchParams } = useUserSearchParams();

  return useQuery({
    queryKey: ["eridu-users", paginationParams, userSearchParams],
    queryFn: async () => {
      const res = await authClient.admin.listUsers({
        query: {
          ...paginationParams,
          ...userSearchParams,
        },
      });

      return res.data;
    },
    refetchOnWindowFocus: false,
  });
};
