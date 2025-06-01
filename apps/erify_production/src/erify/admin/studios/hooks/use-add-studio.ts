import type { FormSchema } from "@/erify/admin/studios/components/forms/add-studio-form";
import type { Studio } from "@/erify/types";
import type { UseMutationOptions } from "@tanstack/react-query";
import type { AxiosError } from "axios";

import { API_ENDPOINTS } from "@/constants/api-endpoints";
import { usePrivateAxios } from "@/hooks/use-private-axios";
import { useMutation } from "@tanstack/react-query";

export const useAddStudio = (options?: UseMutationOptions<Studio, AxiosError, FormSchema>) => {
  const axios = usePrivateAxios();

  return useMutation({
    mutationKey: ["add_studio"],
    mutationFn: async ({ name, address_id }) => {
      const res = await axios.post<Studio>(API_ENDPOINTS.ERIFY.ADMIN.STUDIOS, { name, address_id });

      return res.data;
    },
    ...options,
  });
};
