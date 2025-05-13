import { usePaginationParams } from "@/hooks/use-pagination-params";
import { useSession } from "@eridu/auth-service/hooks/use-session";
import { useQuery } from "@tanstack/react-query";

export const useQueryUsers = () => {
  const { authClient } = useSession();
  const { params: paginationParams } = usePaginationParams();

  return useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      const res = await authClient.admin.listUsers({
        query: {
          ...paginationParams,
        },
      });

      return res.data;
    },
    refetchOnWindowFocus: false,
  });
};
