import type { FormSchema } from "@/erify/admin/clients/components/forms/update-client-form";
import type { Client } from "@/erify/types";
import type { UseMutationOptions } from "@tanstack/react-query";
import type { AxiosError } from "axios";

import { API_ENDPOINTS } from "@/constants/api-endpoints";
import { usePrivateAxios } from "@/hooks/use-private-axios";
import { useMutation } from "@tanstack/react-query";

export const useUpdateClient = (option?: UseMutationOptions<Client, AxiosError, FormSchema>) => {
  const axios = usePrivateAxios();

  return useMutation<Client, AxiosError, FormSchema>({
    mutationKey: ["update_client"],
    mutationFn: async (client) => {
      const res = await axios.patch<Client>(API_ENDPOINTS.ERIFY.ADMIN.CLIENT_DETAILS(client.id), {
        ...client,
      });

      return res.data;
    },
    ...option,
  });
};
