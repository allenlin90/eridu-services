import type { PaginatedData } from "@/api/types";
import type { Show } from "@/erify/types";
import type { UseQueryOptions } from "@tanstack/react-query";
import type { AxiosError } from "axios";

import { API_ENDPOINTS } from "@/constants/api-endpoints";
import { useShowSearchParams } from "@/erify/admin/shows/hooks/use-show-search-params";
import { usePaginationParams } from "@/hooks/use-pagination-params";
import { usePrivateAxios } from "@/hooks/use-private-axios";
import { useQuery } from "@tanstack/react-query";

type PaginatedShows = PaginatedData<Show>;

export const useQueryShows = (options?: UseQueryOptions<PaginatedShows, AxiosError<{ message?: string }>>) => {
  const axios = usePrivateAxios();
  const { params: paginationParams } = usePaginationParams();
  const { params: showSearchParams } = useShowSearchParams();

  return useQuery({
    queryKey: ["shows", paginationParams, showSearchParams],
    queryFn: async () => {
      const { data } = await axios.get<PaginatedShows>(API_ENDPOINTS.ERIFY.ADMIN.SHOWS, {
        params: {
          ...paginationParams,
          ...showSearchParams,
        },
      });

      return data;
    },
    refetchOnWindowFocus: false,
    ...options,
  });
};
