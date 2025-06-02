import type { Material } from "@/erify/types";
import type { UseMutationOptions } from "@tanstack/react-query";
import type { AxiosError } from "axios";

import { usePrivateAxios } from "@/hooks/use-private-axios";
import { useMutation } from "@tanstack/react-query";

export function useRemoveMaterial(options?: UseMutationOptions<Material, AxiosError<{ message?: string }>, Material>) {
  const axios = usePrivateAxios();
  return useMutation({
    mutationKey: ["remove_erify_material"],
    mutationFn: async (material) => {
      await axios.delete(`/admin/materials/${material.id}`);
      return material;
    },
    ...options,
  });
}
