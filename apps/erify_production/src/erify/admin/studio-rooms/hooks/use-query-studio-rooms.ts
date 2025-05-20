import type { PaginatedData } from "@/api/types";
import type { StudioRoom } from "@/erify/types";
import type { UseQueryOptions } from "@tanstack/react-query";
import type { AxiosError } from "axios";

import { API_ENDPOINTS } from "@/constants/api-endpoints";
import { useStudioRoomSearchParams } from "@/erify/admin/studio-rooms/hooks/use-studio-room-search-params";
import { usePaginationParams } from "@/hooks/use-pagination-params";
import { usePrivateAxios } from "@/hooks/use-private-axios";
import { useQuery } from "@tanstack/react-query";

type PaginatedStudioRooms = PaginatedData<StudioRoom>;

export const useQueryStudioRooms = (options?: UseQueryOptions<PaginatedStudioRooms, AxiosError<{ message?: string }>>) => {
  const axios = usePrivateAxios();
  const { params: paginationParams } = usePaginationParams();
  const { params: studioSearchParams } = useStudioRoomSearchParams();

  return useQuery({
    queryKey: ["studio-rooms", paginationParams, studioSearchParams],
    queryFn: async () => {
      const res = await axios.get<PaginatedStudioRooms>(API_ENDPOINTS.ERIFY.ADMIN.STUDIO_ROOMS, {
        params: {
          ...paginationParams,
          ...studioSearchParams,
        },
      });

      return res.data;
    },
    ...options,
  });
};
