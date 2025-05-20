import type { User } from "@/erify/types";
import type { UseMutationOptions } from "@tanstack/react-query";
import type { AxiosError } from "axios";

import { API_ENDPOINTS } from "@/constants/api-endpoints";
import usePrivateAxios from "@/hooks/use-private-axios";
import { useMutation } from "@tanstack/react-query";

type UpdateUserInput = Partial<Pick<User, "name" | "email" | "ext_uid">> & { uid: string };

export const useUpdateUser = (options?: UseMutationOptions<User, AxiosError, UpdateUserInput>) => {
  const axios = usePrivateAxios();

  return useMutation({
    mutationFn: async (input) => {
      const { uid, ...rest } = input;
      const { data } = await axios.patch(`${API_ENDPOINTS.ADMIN.USERS}/${uid}`, {
        ...rest,
        ext_uid: rest.ext_uid || null,
      });
      return data;
    },
    ...options,
  });
};
