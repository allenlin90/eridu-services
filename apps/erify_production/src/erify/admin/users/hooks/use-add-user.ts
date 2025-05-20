import type { FormSchema } from "@/erify/admin/users/components/forms/add-user-form";
import type { User } from "@/erify/types";
import type { UseMutationOptions } from "@tanstack/react-query";
import type { AxiosError } from "axios";

import { API_ENDPOINTS } from "@/constants/api-endpoints";
import { usePrivateAxios } from "@/hooks/use-private-axios";
import { useMutation } from "@tanstack/react-query";

export const useAddUser = (option?: UseMutationOptions<User, AxiosError<{ message?: string }>, FormSchema>) => {
  const axios = usePrivateAxios();

  return useMutation({
    mutationKey: ["add_erify_user"],
    mutationFn: async (values) => {
      const { data } = await axios.post(API_ENDPOINTS.ERIFY.ADMIN.USERS, {
        ...values,
        ext_uid: values.ext_uid || null,
      });

      return data;
    },
    ...option,
  });
};
