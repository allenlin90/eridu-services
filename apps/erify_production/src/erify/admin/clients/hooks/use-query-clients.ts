import type { PaginatedData } from "@/api/types";
import type { Client } from "@/erify/types";
import type { UseQueryOptions } from "@tanstack/react-query";
import type { AxiosError } from "axios";

import { API_ENDPOINTS } from "@/constants/api-endpoints";
import { useClientSearchParams } from "@/erify/admin/clients/hooks/use-client-search-params";
import { usePaginationParams } from "@/hooks/use-pagination-params";
import { usePrivateAxios } from "@/hooks/use-private-axios";
import { useQuery } from "@tanstack/react-query";

type PaginatedClients = PaginatedData<Client>;

export const useQueryClients = (options?: UseQueryOptions<PaginatedClients, AxiosError<{ message?: string }>>) => {
  const axios = usePrivateAxios();
  const { params: paginationParams } = usePaginationParams();
  const { params: clientSearchParams } = useClientSearchParams();

  return useQuery({
    queryKey: ["clients", paginationParams, clientSearchParams],
    queryFn: async () => {
      const res = await axios.get<PaginatedClients>(API_ENDPOINTS.ERIFY.ADMIN.CLIENTS, {
        params: {
          ...paginationParams,
          ...clientSearchParams,
        },
      });

      return res.data;
    },
    ...options,
  });
};
