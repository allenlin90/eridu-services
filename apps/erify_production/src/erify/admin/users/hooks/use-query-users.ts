import { API_ENDPOINTS } from "@/constants/api-endpoints";
import { useUserSearchParams } from "@/erify/admin/users/hooks/use-user-search-params";
import usePaginationParams from "@/hooks/use-pagination-params";
import usePrivateAxios from "@/hooks/use-private-axios";
import { useQuery } from "@tanstack/react-query";
import { type AxiosError, HttpStatusCode } from "axios";

import type { PaginatedUsers } from "../types";

export const useQueryUsers = () => {
  const axios = usePrivateAxios();
  const { params: paginationParams } = usePaginationParams();
  const { params: userSearchParams } = useUserSearchParams();

  return useQuery<PaginatedUsers, AxiosError>({
    queryKey: ["users", paginationParams, userSearchParams],
    queryFn: async () => {
      const { data } = await axios.get<PaginatedUsers>(API_ENDPOINTS.ADMIN.USERS, {
        params: {
          ...paginationParams,
          ...userSearchParams,
        },
      });

      return data;
    },
    refetchOnWindowFocus: false,
    retry: (_failureCount, error) => {
      return error.status !== HttpStatusCode.UnprocessableEntity;
    },
  });
};
