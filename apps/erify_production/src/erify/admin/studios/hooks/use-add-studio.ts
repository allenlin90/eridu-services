import type { Studio } from "@/erify/types";
import type { UseMutationOptions } from "@tanstack/react-query";
import type { AxiosError } from "axios";

import { API_ENDPOINTS } from "@/constants/api-endpoints";
import { usePrivateAxios } from "@/hooks/use-private-axios";
import { useMutation } from "@tanstack/react-query";

export const useAddStudio = (options?: UseMutationOptions<Studio, AxiosError, { name: string }>) => {
  const axios = usePrivateAxios();

  return useMutation({
    mutationKey: ["add_studio"],
    mutationFn: async ({ name }) => {
      const res = await axios.post<Studio>(API_ENDPOINTS.ERIFY.ADMIN.STUDIOS, { name });

      return res.data;
    },
    ...options,
  });
};
