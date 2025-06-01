import type { MC } from "@/erify/types";
import type { UseMutationOptions } from "@tanstack/react-query";
import type { AxiosError } from "axios";

import { API_ENDPOINTS } from "@/constants/api-endpoints";
import { usePrivateAxios } from "@/hooks/use-private-axios";
import { useMutation } from "@tanstack/react-query";

export const useRemoveMc = (option?: UseMutationOptions<MC, AxiosError<{ message?: string }>, MC>) => {
  const axios = usePrivateAxios();

  return useMutation({
    mutationKey: ["remove_mc"],
    mutationFn: async (mc) => {
      await axios.delete(API_ENDPOINTS.ERIFY.ADMIN.MC_DETAILS(mc.id));

      return mc;
    },
    ...option,
  });
};
