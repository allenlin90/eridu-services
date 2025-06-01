import type { Studio } from "@/erify/types";
import type { UseMutationOptions } from "@tanstack/react-query";
import type { AxiosError } from "axios";

import { API_ENDPOINTS } from "@/constants/api-endpoints";
import { usePrivateAxios } from "@/hooks/use-private-axios";
import { useMutation } from "@tanstack/react-query";

export const useRemoveStudio = (option?: UseMutationOptions<Studio, AxiosError<{ message?: string }>, Studio>) => {
  const axios = usePrivateAxios();

  return useMutation({
    mutationKey: ["remove_studio"],
    mutationFn: async (studio) => {
      await axios.delete<Studio>(API_ENDPOINTS.ERIFY.ADMIN.STUDIO_DETAILS(studio.id));

      return studio;
    },
    ...option,
  });
};
