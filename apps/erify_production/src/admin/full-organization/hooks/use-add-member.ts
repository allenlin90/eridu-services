import type { FormSchema } from "@/admin/full-organization/components/forms/add-member-form";
import type { Member } from "@eridu/auth-service/types";
import type { UseMutationOptions } from "@tanstack/react-query";
import type { AxiosError } from "axios";

import { baseURL } from "@/auth/lib";
import { usePrivateAxios } from "@/hooks/use-private-axios";
import { useMutation } from "@tanstack/react-query";

export const useAddMember = (
  options?: UseMutationOptions<Member, AxiosError<{ error: string }>, FormSchema>,
) => {
  const axios = usePrivateAxios();

  return useMutation<Member, AxiosError<{ error: string }>, FormSchema>({
    mutationKey: ["add_member"],
    mutationFn: async ({ userId, role, organizationId, teamId }: FormSchema) => {
      const res = await axios.post<Member>("/api/admin/organization/add-member", {
        userId,
        role,
        organizationId,
        teamId,
      }, {
        baseURL,
      });

      return res.data;
    },
    ...options,
  });
};
