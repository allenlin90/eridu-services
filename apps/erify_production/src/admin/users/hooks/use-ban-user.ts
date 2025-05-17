import { useSession } from "@eridu/auth-service/hooks/use-session";
import { useMutation, useQueryClient } from "@tanstack/react-query";

type AuthClient = ReturnType<typeof useSession>["authClient"];

export const useBanUser = () => {
  const { authClient } = useSession();
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["ban_user"],
    mutationFn: async (...args: Parameters<AuthClient["admin"]["banUser"]>) => {
      const res = await authClient.admin.banUser(...args);

      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["eridu-users"] });
    },
  });
};
