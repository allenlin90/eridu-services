import type { UseQueryOptions } from "@tanstack/react-query";
import type { AxiosError } from "axios";

import { API_ENDPOINTS } from "@/constants/api-endpoints";
import usePrivateAxios from "@/hooks/use-private-axios";
import { useQuery } from "@tanstack/react-query";

import type { ShowMaterial } from "../types/show-materials";

export const useMaterials = (showId: string, option?: UseQueryOptions<ShowMaterial[], AxiosError<{ message?: string }>>) => {
  const axios = usePrivateAxios();

  return useQuery({
    queryKey: ["materials", showId],
    queryFn: async () => {
      const { data } = await axios.get<{ materials: ShowMaterial[] }>(API_ENDPOINTS.SHOWS.MATERIALS(showId!));

      return data.materials;
    },
    enabled: !!showId,
    ...option,
  });
};
