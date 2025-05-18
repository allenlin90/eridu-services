import { useSession } from "@eridu/auth-service/hooks/use-session";
import { useMutation } from "@tanstack/react-query";

type AuthClient = ReturnType<typeof useSession>["authClient"];

export const useSendVerificationEmail = () => {
  const { authClient } = useSession();

  return useMutation({
    mutationKey: ["send_verification_email"],
    mutationFn: async (...args: Parameters<AuthClient["sendVerificationEmail"]>) => {
      const res = await authClient.sendVerificationEmail(...args);

      return res.data;
    },
  });
};
