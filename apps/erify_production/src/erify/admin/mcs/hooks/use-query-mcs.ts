import type { PaginatedData } from "@/api/types";
import type { MC } from "@/erify/types";
import type { UseQueryOptions } from "@tanstack/react-query";
import type { AxiosError } from "axios";

import { API_ENDPOINTS } from "@/constants/api-endpoints";
import { useMcSearchParams } from "@/erify/admin/mcs/hooks/use-mc-search-params";
import { usePaginationParams } from "@/hooks/use-pagination-params";
import { usePrivateAxios } from "@/hooks/use-private-axios";
import { useQuery } from "@tanstack/react-query";

type PaginatedBrands = PaginatedData<MC>;

export const useQueryMcs = (option?: UseQueryOptions<PaginatedBrands, AxiosError<{ message?: string }>>) => {
  const axios = usePrivateAxios();
  const { params: paginationParams } = usePaginationParams();
  const { params: mcSearchParams } = useMcSearchParams();

  return useQuery<PaginatedBrands, AxiosError<{ message?: string }>>({
    queryKey: ["mcs", paginationParams, mcSearchParams],
    queryFn: async () => {
      const res = await axios.get(API_ENDPOINTS.ERIFY.ADMIN.MCS, {
        params: {
          ...paginationParams,
          ...mcSearchParams,
        },
      });

      return res.data;
    },
    ...option,
  });
};
