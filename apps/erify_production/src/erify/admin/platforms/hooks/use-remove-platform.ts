import type { Platform } from "@/erify/types";
import type { UseMutationOptions } from "@tanstack/react-query";
import type { AxiosError } from "axios";

import { API_ENDPOINTS } from "@/constants/api-endpoints";
import { usePrivateAxios } from "@/hooks/use-private-axios";
import { useMutation } from "@tanstack/react-query";

export const useRemovePlatform = (options?: UseMutationOptions<Platform, AxiosError, Platform>) => {
  const axios = usePrivateAxios();

  return useMutation<Platform, AxiosError, Platform>({
    mutationKey: ["remove_platform"],
    mutationFn: async (platform) => {
      await axios.delete(API_ENDPOINTS.ERIFY.ADMIN.PLATFORM_DETAILS(platform.uid));

      return platform;
    },
    ...options,
  });
};
