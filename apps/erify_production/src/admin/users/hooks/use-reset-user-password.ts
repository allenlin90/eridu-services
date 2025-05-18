import { useSession } from "@eridu/auth-service/hooks/use-session";
import { useMutation } from "@tanstack/react-query";

type AuthClient = ReturnType<typeof useSession>["authClient"];

export const useResetUserPassword = () => {
  const { authClient } = useSession();

  return useMutation({
    mutationKey: ["reset_user_password"],
    mutationFn: async (...args: Parameters<AuthClient["admin"]["setUserPassword"]>) => {
      const res = await authClient.admin.setUserPassword(...args);

      return res.data;
    },
  });
};
