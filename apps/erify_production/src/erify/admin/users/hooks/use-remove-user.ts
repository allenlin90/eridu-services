import type { UseMutationOptions } from "@tanstack/react-query";
import type { AxiosError } from "axios";

import { API_ENDPOINTS } from "@/constants/api-endpoints";
import { usePrivateAxios } from "@/hooks/use-private-axios";
import { useMutation } from "@tanstack/react-query";

export const useRemoveUser = (options?: UseMutationOptions<void, AxiosError<{ message?: string }>, string>) => {
  const axios = usePrivateAxios();

  return useMutation({
    mutationKey: ["remove_user"],
    mutationFn: async (uid: string) => {
      await axios.delete(API_ENDPOINTS.ERIFY.ADMIN.USER_DETAILS(uid));
    },
    ...options,
  });
};
