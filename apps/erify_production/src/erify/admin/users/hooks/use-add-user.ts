import { useSession } from "@eridu/auth-service/hooks/use-session";
import { useMutation, useQueryClient } from "@tanstack/react-query";

type AuthClient = ReturnType<typeof useSession>["authClient"];

export const useAddUser = () => {
  const { authClient } = useSession();
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["add_user"],
    mutationFn: async (...args: Parameters<AuthClient["admin"]["createUser"]>) => {
      const user = await authClient.admin.createUser(...args);

      return user;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });
};
