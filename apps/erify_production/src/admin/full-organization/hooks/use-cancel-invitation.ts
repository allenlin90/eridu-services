import { useSession } from "@eridu/auth-service/hooks/use-session";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export const useCancelInvitation = () => {
  const { authClient } = useSession();
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["cancel_invitation"],
    mutationFn: async (...args: Parameters<typeof authClient["organization"]["cancelInvitation"]>) => {
      const res = await authClient.organization.cancelInvitation(...args);

      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["organization"] });
    },
  });
};
