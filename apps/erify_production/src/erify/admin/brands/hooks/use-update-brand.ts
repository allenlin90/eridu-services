import type { Brand } from "@/erify/types";
import type { UseMutationOptions } from "@tanstack/react-query";
import type { AxiosError } from "axios";

import usePrivateAxios from "@/hooks/use-private-axios";
import { useMutation } from "@tanstack/react-query";

import type { FormSchema } from "../components/forms/update-brand";

export const useUpdateBrand = (option?: UseMutationOptions<Brand, AxiosError, FormSchema>) => {
  const axios = usePrivateAxios();

  return useMutation<Brand, AxiosError, FormSchema>({
    mutationKey: ["update_brand"],
    mutationFn: async (brand) => {
      const res = await axios.patch<Brand>(`/admin/brands/${brand.uid}`, {
        ...brand,
      });

      return res.data;
    },
    ...option,
  });
};
