import type { PaginatedData } from "@/api/types";
import type { Studio } from "@/erify/types";
import type { UseQueryOptions } from "@tanstack/react-query";
import type { AxiosError } from "axios";

import { API_ENDPOINTS } from "@/constants/api-endpoints";
import { useStudioSearchParams } from "@/erify/admin/studios/hooks/use-studio-search-params";
import { usePaginationParams } from "@/hooks/use-pagination-params";
import { usePrivateAxios } from "@/hooks/use-private-axios";
import { useQuery } from "@tanstack/react-query";

type PaginatedStudios = PaginatedData<Studio>;

export const useQueryStudios = (options?: UseQueryOptions<PaginatedStudios, AxiosError<{ message?: string }>>) => {
  const axios = usePrivateAxios();
  const { params: paginationParams } = usePaginationParams();
  const { params: searchParams } = useStudioSearchParams();

  return useQuery({
    queryKey: ["studios", paginationParams, searchParams],
    queryFn: async () => {
      const res = await axios.get<PaginatedStudios>(API_ENDPOINTS.ERIFY.ADMIN.STUDIOS, {
        params: {
          ...paginationParams,
          ...searchParams,
        },
      });

      return res.data;
    },
    ...options,
  });
};
