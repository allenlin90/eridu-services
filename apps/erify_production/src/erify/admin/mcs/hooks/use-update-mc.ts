import type { FormSchema } from "@/erify/admin/mcs/components/forms/update-mc-form";
import type { MC } from "@/erify/types";
import type { AxiosError } from "axios";

import { API_ENDPOINTS } from "@/constants/api-endpoints";
import { usePrivateAxios } from "@/hooks/use-private-axios";
import { useMutation, type UseMutationOptions } from "@tanstack/react-query";

export const useUpdateMc = (option?: UseMutationOptions<MC, AxiosError, FormSchema>) => {
  const axios = usePrivateAxios();

  return useMutation({
    mutationKey: ["update_mc"],
    mutationFn: async ({ id, name, email, ext_id, ranking }) => {
      const res = await axios.patch<MC>(API_ENDPOINTS.ERIFY.ADMIN.MC_DETAILS(id), {
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
