import type { PaginatedData } from "@/api/types";
import type { Platform } from "@/erify/types";
import type { UseQueryOptions } from "@tanstack/react-query";
import type { AxiosError } from "axios";

import { API_ENDPOINTS } from "@/constants/api-endpoints";
import { usePlatformSearchParams } from "@/erify/admin/platforms/hooks/use-platform-search-params";
import { usePaginationParams } from "@/hooks/use-pagination-params";
import { usePrivateAxios } from "@/hooks/use-private-axios";
import { useQuery } from "@tanstack/react-query";

type PaginatedPlatforms = PaginatedData<Platform>;

export const useQueryPlatforms = (options?: UseQueryOptions<PaginatedPlatforms, AxiosError<{ message?: string }>>) => {
  const axios = usePrivateAxios();
  const { params: paginationParams } = usePaginationParams();
  const { params: platformSearchParams } = usePlatformSearchParams();

  return useQuery({
    queryKey: ["platforms", paginationParams, platformSearchParams],
    queryFn: async () => {
      const res = await axios.get<PaginatedPlatforms>(API_ENDPOINTS.ERIFY.ADMIN.PLATFORMS, {
        params: {
          ...paginationParams,
          ...platformSearchParams,
        },
      });

      return res.data;
    },
    ...options,
  });
};
