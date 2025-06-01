import type { FormSchema } from "@/erify/admin/studio-rooms/components/forms/update-studio-room-form";
import type { StudioRoom } from "@/erify/types";
import type { UseMutationOptions } from "@tanstack/react-query";
import type { AxiosError } from "axios";

import { API_ENDPOINTS } from "@/constants/api-endpoints";
import { usePrivateAxios } from "@/hooks/use-private-axios";
import { useMutation } from "@tanstack/react-query";

export const useUpdateStudioRoom = (options?: UseMutationOptions<StudioRoom, AxiosError, FormSchema>) => {
  const axios = usePrivateAxios();

  return useMutation({
    mutationKey: ["update_studio_room"],
    mutationFn: async (values) => {
      const res = await axios.patch<StudioRoom>(
        API_ENDPOINTS.ERIFY.ADMIN.STUDIO_ROOM_DETAILS(values.id),
        { ...values },
      );

      return res.data;
    },
    ...options,
  });
};
