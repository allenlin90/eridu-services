import type { FormSchema } from "@/erify/admin/brands/components/forms/add-brand-form";
import type { Brand } from "@/erify/types";
import type { UseMutationOptions } from "@tanstack/react-query";
import type { AxiosError } from "axios";

import { API_ENDPOINTS } from "@/constants/api-endpoints";
import { usePrivateAxios } from "@/hooks/use-private-axios";
import { useMutation } from "@tanstack/react-query";

export const useAddBrand = (option?: UseMutationOptions<Brand, AxiosError, FormSchema>) => {
  const axios = usePrivateAxios();

  return useMutation<Brand, AxiosError, FormSchema>({
    mutationKey: ["add_brand"],
    mutationFn: async ({ name }) => {
      const res = await axios.post<Brand>(API_ENDPOINTS.ERIFY.ADMIN.BRANDS, {
        name,
      });

      return res.data;
    },
    ...option,
  });
};
