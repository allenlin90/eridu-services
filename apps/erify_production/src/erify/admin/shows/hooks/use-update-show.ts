import type { Show } from "@/erify/types";
import type { UseMutationOptions } from "@tanstack/react-query";
import type { AxiosError } from "axios";

import { API_ENDPOINTS } from "@/constants/api-endpoints";
import { usePrivateAxios } from "@/hooks/use-private-axios";
import { useMutation } from "@tanstack/react-query";

export const useUpdateShow = (options?: UseMutationOptions<Show, AxiosError, Show>) => {
  const axios = usePrivateAxios();

  return useMutation({
    mutationKey: ["update_show"],
    mutationFn: async (show) => {
      const { data } = await axios.patch<Show>(
        API_ENDPOINTS.ERIFY.ADMIN.SHOW_DETAILS(show.id),
        show,
      );

      return data;
    },
    ...options,
  });
};
