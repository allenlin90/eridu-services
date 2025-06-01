import type { Client } from "@/erify/types";
import type { UseMutationOptions } from "@tanstack/react-query";
import type { AxiosError } from "axios";

import { API_ENDPOINTS } from "@/constants/api-endpoints";
import { usePrivateAxios } from "@/hooks/use-private-axios";
import { useMutation } from "@tanstack/react-query";

export const useRemoveClient = (option?: UseMutationOptions<Client, AxiosError<{ message?: string }>, Client>) => {
  const axios = usePrivateAxios();

  return useMutation<Client, AxiosError<{ message?: string }>, Client>({
    mutationKey: ["remove_client"],
    mutationFn: async (client) => {
      await axios.delete(API_ENDPOINTS.ERIFY.ADMIN.CLIENT_DETAILS(client.id));

      return client;
    },
    ...option,
  });
};
