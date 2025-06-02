import type { Material } from "@/erify/types";
import type { UseMutationOptions } from "@tanstack/react-query";
import type { AxiosError } from "axios";

import { usePrivateAxios } from "@/hooks/use-private-axios";
import { useMutation } from "@tanstack/react-query";

import type { FormSchema } from "../components/forms/update-material-form";

export function useUpdateMaterial(options?: UseMutationOptions<Material, AxiosError<{ message?: string }>, FormSchema>) {
  const axios = usePrivateAxios();

  return useMutation({
    mutationKey: ["update_erify_material"],
    mutationFn: async (input) => {
      const { id, ...rest } = input;
      const { data } = await axios.patch<Material>(`/admin/materials/${id}`, rest);

      return data;
    },
    ...options,
  });
}
