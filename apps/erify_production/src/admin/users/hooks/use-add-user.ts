import useSession from "@eridu/auth-service/hooks/use-session";
import { useMutation } from "@tanstack/react-query";

type AuthClient = ReturnType<typeof useSession>["authClient"];

export const useAddUser = () => {
  const { authClient } = useSession();

  return useMutation({
    mutationKey: ["add_user"],
    mutationFn: async (...args: Parameters<AuthClient["admin"]["createUser"]>) => {
      const user = await authClient.admin.createUser(...args);

      return user;
    },
  });
};
