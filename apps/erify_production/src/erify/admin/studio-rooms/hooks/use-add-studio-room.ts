import type { FormSchema } from "@/erify/admin/studio-rooms/components/forms/add-studio-room-form";
import type { StudioRoom } from "@/erify/types";
import type { UseMutationOptions } from "@tanstack/react-query";
import type { AxiosError } from "axios";

import { API_ENDPOINTS } from "@/constants/api-endpoints";
import { usePrivateAxios } from "@/hooks/use-private-axios";
import { useMutation } from "@tanstack/react-query";

export const useAddStudioRoom = (options?: UseMutationOptions<StudioRoom, AxiosError, FormSchema>) => {
  const axios = usePrivateAxios();

  return useMutation({
    mutationKey: ["add_studio_room"],
    mutationFn: async ({ name, type, studio_id }) => {
      const res = await axios.post<StudioRoom>(
        API_ENDPOINTS.ERIFY.ADMIN.STUDIO_ROOMS,
        { name, type, studio_id },
      );

      return res.data;
    },
    ...options,
  });
};
