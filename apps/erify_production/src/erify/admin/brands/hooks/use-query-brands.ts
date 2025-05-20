import type { PaginatedData } from "@/api/types";
import type { Brand } from "@/erify/types";
import type { UseQueryOptions } from "@tanstack/react-query";
import type { AxiosError } from "axios";

import { API_ENDPOINTS } from "@/constants/api-endpoints";
import { useBrandSearchParams } from "@/erify/admin/brands/hooks/use-brand-search-params";
import { usePaginationParams } from "@/hooks/use-pagination-params";
import { usePrivateAxios } from "@/hooks/use-private-axios";
import { useQuery } from "@tanstack/react-query";

type PaginatedBrands = PaginatedData<Brand>;

export const useQueryBrands = (options?: UseQueryOptions<PaginatedBrands, AxiosError<{ message?: string }>>) => {
  const axios = usePrivateAxios();
  const { params: paginationParams } = usePaginationParams();
  const { params: brandSearchParams } = useBrandSearchParams();

  return useQuery({
    queryKey: ["brands", paginationParams, brandSearchParams],
    queryFn: async () => {
      const res = await axios.get<PaginatedBrands>(API_ENDPOINTS.ERIFY.ADMIN.BRANDS, {
        params: {
          ...paginationParams,
          ...brandSearchParams,
        },
      });

      return res.data;
    },
    ...options,
  });
};
