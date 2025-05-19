import type { PaginatedData } from "@/api/types";
import type { MC } from "@/erify/types";
import type { UseQueryOptions } from "@tanstack/react-query";
import type { AxiosError } from "axios";

import { useMemberSearchParams } from "@/erify/admin/mcs/hooks/use-member-search-params";
import { usePaginationParams } from "@/hooks/use-pagination-params";
import { usePrivateAxios } from "@/hooks/use-private-axios";
import { useQuery } from "@tanstack/react-query";

type PaginatedBrands = PaginatedData<MC>;

export const useQueryMcs = (option?: UseQueryOptions<PaginatedBrands, AxiosError<{ message?: string }>>) => {
  const axios = usePrivateAxios();
  const { params: paginationParams } = usePaginationParams();
  const { params: memberSearchParams } = useMemberSearchParams();

  return useQuery<PaginatedBrands, AxiosError<{ message?: string }>>({
    queryKey: ["mcs", paginationParams, memberSearchParams],
    queryFn: async () => {
      const res = await axios.get("/admin/mcs", {
        params: {
          ...paginationParams,
          ...memberSearchParams,
        },
      });

      return res.data;
    },
    ...option,
  });
};
