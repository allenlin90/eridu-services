import type { StudioRoom } from "@/erify/types";
import type { UseMutationOptions } from "@tanstack/react-query";
import type { AxiosError } from "axios";

import { API_ENDPOINTS } from "@/constants/api-endpoints";
import { usePrivateAxios } from "@/hooks/use-private-axios";
import { useMutation } from "@tanstack/react-query";

export const useRemoveStudioRoom = (options?: UseMutationOptions<StudioRoom, AxiosError, StudioRoom>) => {
  const axios = usePrivateAxios();

  return useMutation<StudioRoom, AxiosError, StudioRoom>({
    mutationKey: ["remove_studio_room"],
    mutationFn: async (studioRoom) => {
      await axios.delete(API_ENDPOINTS.ERIFY.ADMIN.STUDIO_ROOM_DETAILS(studioRoom.uid));

      return studioRoom;
    },
    ...options,
  });
};
