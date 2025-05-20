import type { FormSchema } from "@/erify/admin/brands/components/forms/update-brand";
import type { Brand } from "@/erify/types";
import type { UseMutationOptions } from "@tanstack/react-query";
import type { AxiosError } from "axios";

import { API_ENDPOINTS } from "@/constants/api-endpoints";
import { usePrivateAxios } from "@/hooks/use-private-axios";
import { useMutation } from "@tanstack/react-query";

export const useUpdateBrand = (option?: UseMutationOptions<Brand, AxiosError, FormSchema>) => {
  const axios = usePrivateAxios();

  return useMutation<Brand, AxiosError, FormSchema>({
    mutationKey: ["update_brand"],
    mutationFn: async (brand) => {
      const res = await axios.patch<Brand>(API_ENDPOINTS.ERIFY.ADMIN.BRAND_DETAILS(brand.uid), {
        ...brand,
      });

      return res.data;
    },
    ...option,
  });
};
