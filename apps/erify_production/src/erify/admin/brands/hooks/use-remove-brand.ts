import type { Brand } from "@/erify/types";
import type { UseMutationOptions } from "@tanstack/react-query";
import type { AxiosError } from "axios";

import usePrivateAxios from "@/hooks/use-private-axios";
import { useMutation } from "@tanstack/react-query";

export const useRemoveBrand = (option?: UseMutationOptions<Brand, AxiosError<{ message?: string }>, Brand>) => {
  const axios = usePrivateAxios();

  return useMutation<Brand, AxiosError<{ message?: string }>, Brand>({
    mutationKey: [],
    mutationFn: async (brand) => {
      await axios.delete(`/admin/brands/${brand.uid}`);

      return brand;
    },
    ...option,
  });
};
