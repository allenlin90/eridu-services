import type { FormSchema } from "@/erify/admin/studios/components/forms/update-studio-form";
import type { Studio } from "@/erify/types";
import type { UseMutationOptions } from "@tanstack/react-query";
import type { AxiosError } from "axios";

import { API_ENDPOINTS } from "@/constants/api-endpoints";
import { usePrivateAxios } from "@/hooks/use-private-axios";
import { useMutation } from "@tanstack/react-query";

export const useUpdateStudio = (option?: UseMutationOptions<Studio, AxiosError, FormSchema>) => {
  const axios = usePrivateAxios();

  return useMutation({
    mutationKey: ["update_studio"],
    mutationFn: async (studio) => {
      const res = await axios.patch<Studio>(API_ENDPOINTS.ERIFY.ADMIN.STUDIO_DETAILS(studio.id), {
        ...studio,
      });

      return res.data;
    },
    ...option,
  });
};
