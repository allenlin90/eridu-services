import type { Platform } from "@/erify/types";
import type { UseMutationOptions } from "@tanstack/react-query";
import type { AxiosError } from "axios";

import { API_ENDPOINTS } from "@/constants/api-endpoints";
import { usePrivateAxios } from "@/hooks/use-private-axios";
import { useMutation } from "@tanstack/react-query";

export const useAddPlatform = (options?: UseMutationOptions<Platform, AxiosError, { name: string }>) => {
  const axios = usePrivateAxios();

  return useMutation<Platform, AxiosError, { name: string }>({
    mutationKey: ["add_platform"],
    mutationFn: async ({ name }) => {
      const res = await axios.post<Platform>(API_ENDPOINTS.ERIFY.ADMIN.PLATFORMS, { name });

      return res.data;
    },
    ...options,
  });
};
