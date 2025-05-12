import useSession from "@eridu/auth-service/hooks/use-session";
import { useMutation } from "@tanstack/react-query";

export const useResetPassword = () => {
  const { authClient } = useSession();

  return useMutation({
    mutationKey: ["reset_password"],
    mutationFn: async ({ password, token }: { password: string; token: string }) => {
      const res = await authClient.resetPassword({ newPassword: password, token });

      return res;
    },
  });
};
