import type { MC } from "@/erify/types";
import type { UseMutationOptions } from "@tanstack/react-query";
import type { AxiosError } from "axios";

import { usePrivateAxios } from "@/hooks/use-private-axios";
import { useMutation } from "@tanstack/react-query";

import type { FormSchema } from "../components/forms/add-mc-form";

export const useAddMc = (option?: UseMutationOptions<MC, AxiosError<any>, FormSchema>) => {
  const axios = usePrivateAxios();

  return useMutation({
    mutationKey: ["add_mc"],
    mutationFn: async ({ name, user_uid }) => {
      const res = await axios
        .post("/admin/mcs", {
          name,
          user_uid: user_uid || null,
        });

      return res.data;
    },
    ...option,
  });
};
