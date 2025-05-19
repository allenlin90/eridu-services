import type { Brand } from "@/erify/types";
import type { UseMutationOptions } from "@tanstack/react-query";
import type { AxiosError } from "axios";

import usePrivateAxios from "@/hooks/use-private-axios";
import { useMutation } from "@tanstack/react-query";

import type { FormSchema } from "../components/forms/add-new-brand";

export const useAddBrand = (option?: UseMutationOptions<Brand, AxiosError, FormSchema>) => {
  const axios = usePrivateAxios();

  return useMutation<Brand, AxiosError, FormSchema>({
    mutationKey: ["add_brand"],
    mutationFn: async ({ name }) => {
      const res = await axios.post<Brand>("/admin/brands", {
        name,
      });

      return res.data;
    },
    ...option,
  });
};
