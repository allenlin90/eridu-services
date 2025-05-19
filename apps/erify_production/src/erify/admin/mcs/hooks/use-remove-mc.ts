import type { MC } from "@/erify/types";
import type { UseMutationOptions } from "@tanstack/react-query";
import type { AxiosError } from "axios";

import usePrivateAxios from "@/hooks/use-private-axios";
import { useMutation } from "@tanstack/react-query";

export const useRemoveMc = (option?: UseMutationOptions<MC, AxiosError<{ message?: string }>, MC>) => {
  const axios = usePrivateAxios();

  return useMutation({
    mutationKey: ["remove_mc"],
    mutationFn: async (mc) => {
      await axios.delete(`/admin/mcs/${mc.uid}`);

      return mc;
    },
    ...option,
  });
};
