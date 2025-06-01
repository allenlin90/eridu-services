import type { FormSchema } from "@/erify/admin/mcs/components/forms/add-mc-form";
import type { MC } from "@/erify/types";
import type { UseMutationOptions } from "@tanstack/react-query";
import type { AxiosError } from "axios";

import { API_ENDPOINTS } from "@/constants/api-endpoints";
import { usePrivateAxios } from "@/hooks/use-private-axios";
import { useMutation } from "@tanstack/react-query";

export const useAddMc = (option?: UseMutationOptions<MC, AxiosError<any>, FormSchema>) => {
  const axios = usePrivateAxios();

  return useMutation({
    mutationKey: ["add_mc"],
    mutationFn: async ({ name, email, ext_id, ranking }) => {
      const res = await axios.post(API_ENDPOINTS.ERIFY.ADMIN.MCS, {
        name,
        email,
        ext_id: ext_id || null,
        ranking,
      });

      return res.data;
    },
    ...option,
  });
};
