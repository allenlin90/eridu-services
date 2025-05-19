import type { PaginatedData } from "@/api/types";
import type { Brand } from "@/erify/types";
import type { UseQueryOptions } from "@tanstack/react-query";
import type { AxiosError } from "axios";

import { usePrivateAxios } from "@/hooks/use-private-axios";
import { useQuery } from "@tanstack/react-query";

type PaginatedBrands = PaginatedData<Brand>;

export const useQueryBrands = (options?: UseQueryOptions<PaginatedBrands, AxiosError<{ message?: string }>>) => {
  const axios = usePrivateAxios();

  return useQuery({
    queryKey: ["brands"],
    queryFn: async () => {
      const res = await axios.get<PaginatedBrands>("/admin/brands");

      return res.data;
    },
    ...options,
  });
};
