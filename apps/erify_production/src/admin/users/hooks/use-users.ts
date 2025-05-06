import { API_ENDPOINTS } from "@/constants/api-endpoints";
import usePaginationParams from "@/hooks/use-pagination-params";
import usePrivateAxios from "@/hooks/use-private-axios";
import { useQuery } from "@tanstack/react-query";

import type { PaginatedUsers } from "../types";

export const useUsers = () => {
  const axios = usePrivateAxios();
  const { params: paginationParams } = usePaginationParams();

  return useQuery({
    queryKey: ["users", paginationParams],
    queryFn: async () => {
      const { data } = await axios.get<PaginatedUsers>(API_ENDPOINTS.ADMIN.USERS, {
        params: {
          ...paginationParams,
        },
      });

      return data;
    },
    refetchOnWindowFocus: false,
  });
};
