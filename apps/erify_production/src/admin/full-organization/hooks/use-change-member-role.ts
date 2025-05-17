import type { AuthClient } from "@eridu/auth-service/types";

import { useSession } from "@eridu/auth-service/hooks/use-session";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export const useChangeMemberRole = () => {
  const { authClient } = useSession();
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["change_member_role"],
    mutationFn: async (...args: Parameters<AuthClient["organization"]["updateMemberRole"]>) => {
      const res = await authClient.organization.updateMemberRole(...args);

      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["organization"] });
    },
  });
};
