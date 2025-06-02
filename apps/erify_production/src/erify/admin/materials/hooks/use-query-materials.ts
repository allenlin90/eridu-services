import type { PaginatedData } from "@/api/types";
import type { Material } from "@/erify/types";
import type { UseQueryOptions } from "@tanstack/react-query";
import type { AxiosError } from "axios";

import { API_ENDPOINTS } from "@/constants/api-endpoints";
import { useMaterialSearchParams } from "@/erify/admin/materials/hooks/use-material-search-params";
import { usePaginationParams } from "@/hooks/use-pagination-params";
import { usePrivateAxios } from "@/hooks/use-private-axios";
import { useQuery } from "@tanstack/react-query";

export type PaginatedMaterials = PaginatedData<Material>;

export function useQueryMaterials(options?: UseQueryOptions<PaginatedMaterials, AxiosError<{ message?: string }>>) {
  const axios = usePrivateAxios();
  const { params: paginationParams } = usePaginationParams();
  const { params: materialSearchParams } = useMaterialSearchParams();

  return useQuery({
    queryKey: ["erify_materials", paginationParams, materialSearchParams],
    queryFn: async () => {
      const { data } = await axios.get<PaginatedMaterials>(API_ENDPOINTS.ERIFY.ADMIN.MATERIALS, {
        params: {
          ...paginationParams,
          ...materialSearchParams,
        },
      });
      return data;
    },
    ...options,
  });
}
