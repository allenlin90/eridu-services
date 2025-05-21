import type { FormSchema } from "@/erify/admin/shows/components/forms/add-show-form";
import type { Show } from "@/erify/types";
import type { UseMutationOptions } from "@tanstack/react-query";
import type { AxiosError } from "axios";

import { API_ENDPOINTS } from "@/constants/api-endpoints";
import { usePrivateAxios } from "@/hooks/use-private-axios";
import { generateUUID } from "@/utils";
import { useMutation } from "@tanstack/react-query";

export const useAddShow = (option?: UseMutationOptions<Show, AxiosError<{ message: string }>, FormSchema>) => {
  const axios = usePrivateAxios();

  return useMutation({
    mutationKey: ["add_erify_show"],
    mutationFn: async (values) => {
      const { start_time, end_time, ...rest } = values;

      const payload = {
        ...rest,
        start_time: new Date(start_time).toISOString(),
        end_time: new Date(end_time).toISOString(),
      };

      const { data } = await axios.post(
        API_ENDPOINTS.ERIFY.ADMIN.SHOWS,
        payload,
        {
          headers: {
            "Content-Type": "application/json",
            "Idempotency-Key": generateUUID(),
          },
        },
      );

      return data;
    },
    ...option,
  });
};
