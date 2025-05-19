import type { MC } from "@/erify/types";
import type { AxiosError } from "axios";

import usePrivateAxios from "@/hooks/use-private-axios";
import { useMutation, type UseMutationOptions } from "@tanstack/react-query";

import type { FormSchema } from "../components/forms/update-mc-form";

export const useUpdateMc = (option?: UseMutationOptions<MC, AxiosError, FormSchema>) => {
  const axios = usePrivateAxios();

  return useMutation({
    mutationKey: ["update_mc"],
    mutationFn: async ({ uid, name, user_uid }) => {
      const res = await axios.patch<MC>(`/admin/mcs/${uid}`, {
        name,
        user_uid: user_uid || null,
      });

      return res.data;
    },
    ...option,
  });
};
