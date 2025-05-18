import { useSession } from "@eridu/auth-service/hooks/use-session";
import { useMutation } from "@tanstack/react-query";

type AuthClient = ReturnType<typeof useSession>["authClient"];

export const useRevokeUserSessions = () => {
  const { authClient } = useSession();

  return useMutation({
    mutationKey: ["revoke_user_sessions"],
    mutationFn: async (...args: Parameters<AuthClient["admin"]["revokeUserSessions"]>) => {
      const user = await authClient.admin.revokeUserSessions(...args);

      return user;
    },
  });
};
