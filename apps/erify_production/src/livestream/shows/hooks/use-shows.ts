import { usePaginationParams } from "@/hooks/use-pagination-params";
import usePrivateAxios from "@/hooks/use-private-axios";
import { useQuery } from "@tanstack/react-query";

import type { PaginatedShowTableRow } from "../types/show-table-row";

import { useDateSearchParams } from "./use-date-search-params";

export const useShows = () => {
  const axios = usePrivateAxios();
  const { params: paginationParams } = usePaginationParams();
  const { params: dateRangeParams } = useDateSearchParams();

  return useQuery({
    queryKey: ["shows", paginationParams, dateRangeParams],
    queryFn: async () => {
      const { data } = await axios
        .get<PaginatedShowTableRow>("/shows", {
          params: {
            ...paginationParams,
            ...dateRangeParams,
          },
        });
      return data;
    },
    refetchOnWindowFocus: false,
  });
};
