import type { UseQueryOptions } from "@tanstack/react-query";

import { API_ENDPOINTS } from "@/constants/api-endpoints";
import { usePaginationParams } from "@/hooks/use-pagination-params";
import { usePrivateAxios } from "@/hooks/use-private-axios";
import { useQuery } from "@tanstack/react-query";
import { type AxiosError, HttpStatusCode } from "axios";

import type { PaginatedShowTableRow } from "../types/show-table-row";

import { useDateSearchParams } from "./use-date-search-params";

export const useShows = (options?: UseQueryOptions<PaginatedShowTableRow, AxiosError<{ message?: string }>>) => {
  const axios = usePrivateAxios();
  const { params: paginationParams } = usePaginationParams();
  const { params: dateRangeParams } = useDateSearchParams();

  return useQuery({
    queryKey: ["shows", paginationParams, dateRangeParams],
    queryFn: async () => {
      const { data } = await axios
        .get<PaginatedShowTableRow>(API_ENDPOINTS.SHOWS.BASE, {
          params: {
            ...paginationParams,
            ...dateRangeParams,
          },
        });
      return data;
    },
    retry: (failureCount, error) => {
      if (error.status === HttpStatusCode.NotFound) {
        return false;
      }

      return failureCount < 3;
    },
    refetchOnWindowFocus: false,
    ...options,
  });
};
