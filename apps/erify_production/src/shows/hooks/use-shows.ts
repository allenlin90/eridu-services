import { useDateRangeParams } from "@/hooks/use-date-range-params";
import { usePaginationParams } from "@/hooks/use-pagination-params";
import usePrivateAxios from "@/hooks/use-private-axios";
import { useQuery } from "@tanstack/react-query";

import type { PaginatedShowTableRow } from "../types/show-table-row";

export const useShows = () => {
  const axios = usePrivateAxios();
  const { params: paginationParams } = usePaginationParams();
  const { params: dateRangeParams } = useDateRangeParams();

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
