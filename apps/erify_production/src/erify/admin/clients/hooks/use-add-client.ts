import type { FormSchema } from "@/erify/admin/clients/components/forms/add-client-form";
import type { Client } from "@/erify/types";
import type { UseMutationOptions } from "@tanstack/react-query";
import type { AxiosError } from "axios";

import { API_ENDPOINTS } from "@/constants/api-endpoints";
import { usePrivateAxios } from "@/hooks/use-private-axios";
import { useMutation } from "@tanstack/react-query";

export const useAddClient = (option?: UseMutationOptions<Client, AxiosError, FormSchema>) => {
  const axios = usePrivateAxios();

  return useMutation<Client, AxiosError, FormSchema>({
    mutationKey: ["add_client"],
    mutationFn: async ({ name }) => {
      const res = await axios.post<Client>(API_ENDPOINTS.ERIFY.ADMIN.CLIENTS, {
        name,
      });

      return res.data;
    },
    ...option,
  });
};
