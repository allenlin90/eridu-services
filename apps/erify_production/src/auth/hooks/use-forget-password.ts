import useSession from "@eridu/auth-service/hooks/use-session";
import { useMutation } from "@tanstack/react-query";

export const useForgetPassword = () => {
  const { authClient } = useSession();

  return useMutation({
    mutationKey: ["forget_password"],
    mutationFn: async ({ email }: { email: string }) => {
      const res = await authClient.forgetPassword({ email });

      return res.data?.status ?? false;
    },
  });
};
