import type { FormSchema } from "@/erify/admin/materials/components/forms/add-material-form";
import type { Material } from "@/erify/types";
import type { UseMutationOptions } from "@tanstack/react-query";
import type { AxiosError } from "axios";

import { usePrivateAxios } from "@/hooks/use-private-axios";
import { useMutation } from "@tanstack/react-query";

export function useAddMaterial(options?: UseMutationOptions<Material, AxiosError<{ message?: string }>, FormSchema>) {
  const axios = usePrivateAxios();

  return useMutation({
    mutationKey: ["add_erify_material"],
    mutationFn: async ({ client_id, description, name, resource_url, type }) => {
      const { data } = await axios.post("/admin/materials", {
        client_id: client_id || null,
        description: description || null,
        name,
        resource_url,
        type,
      });

      return data;
    },
    ...options,
  });
}
