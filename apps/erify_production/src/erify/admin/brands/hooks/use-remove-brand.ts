import type { Brand } from "@/erify/types";
import type { UseMutationOptions } from "@tanstack/react-query";
import type { AxiosError } from "axios";

import { API_ENDPOINTS } from "@/constants/api-endpoints";
import { usePrivateAxios } from "@/hooks/use-private-axios";
import { useMutation } from "@tanstack/react-query";

export const useRemoveBrand = (option?: UseMutationOptions<Brand, AxiosError<{ message?: string }>, Brand>) => {
  const axios = usePrivateAxios();

  return useMutation<Brand, AxiosError<{ message?: string }>, Brand>({
    mutationKey: ["remove_brand"],
    mutationFn: async (brand) => {
      await axios.delete(API_ENDPOINTS.ERIFY.ADMIN.BRAND_DETAILS(brand.uid));

      return brand;
    },
    ...option,
  });
};
