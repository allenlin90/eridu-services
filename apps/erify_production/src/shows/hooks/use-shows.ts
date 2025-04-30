import { usePaginationParams } from "@/hooks/use-pagination-params";
import usePrivateAxios from "@/hooks/use-private-axios";
import { useQuery } from "@tanstack/react-query";

import type { PaginatedShowTableRow } from "../types/show-table-row";

export const useShows = () => {
  const axios = usePrivateAxios();
  const { params } = usePaginationParams();

  return useQuery({
    queryKey: ["shows", params],
    queryFn: async () => {
      const { data } = await axios
        .get<PaginatedShowTableRow>("/shows", {
          params,
        });
      return data;
    },
    refetchOnWindowFocus: false,
  });
};
