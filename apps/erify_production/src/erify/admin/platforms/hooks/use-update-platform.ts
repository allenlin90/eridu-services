import type { Platform } from "@/erify/types";
import type { UseMutationOptions } from "@tanstack/react-query";
import type { AxiosError } from "axios";

import { API_ENDPOINTS } from "@/constants/api-endpoints";
import { usePrivateAxios } from "@/hooks/use-private-axios";
import { useMutation } from "@tanstack/react-query";

export const useUpdatePlatform = (options?: UseMutationOptions<Platform, AxiosError, { uid: string; name: string }>) => {
  const axios = usePrivateAxios();

  return useMutation<Platform, AxiosError, { uid: string; name: string }>({
    mutationKey: ["update_platform"],
    mutationFn: async ({ uid, name }) => {
      const res = await axios.patch<Platform>(API_ENDPOINTS.ERIFY.ADMIN.PLATFORM_DETAILS(uid), { name });

      return res.data;
    },
    ...options,
  });
};
