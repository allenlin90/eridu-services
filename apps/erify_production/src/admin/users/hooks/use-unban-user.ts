import { useSession } from "@eridu/auth-service/hooks/use-session";
import { useMutation, useQueryClient } from "@tanstack/react-query";

type AuthClient = ReturnType<typeof useSession>["authClient"];

export const useUnbanUser = () => {
  const { authClient } = useSession();
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["unban_user"],
    mutationFn: async (...args: Parameters<AuthClient["admin"]["unbanUser"]>) => {
      const res = await authClient.admin.unbanUser(...args);

      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["eridu-users"] });
    },
  });
};
