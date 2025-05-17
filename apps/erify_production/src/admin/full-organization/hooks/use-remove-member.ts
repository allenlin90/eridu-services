import { useSession } from "@eridu/auth-service/hooks/use-session";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export const useRemoveMember = () => {
  const { authClient } = useSession();
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["remove_member"],
    mutationFn: async (...args: Parameters<typeof authClient.organization.removeMember>) => {
      const res = await authClient.organization.removeMember(...args);

      if (res.data) {
        queryClient.invalidateQueries({ queryKey: ["organization"] });
      }

      return res.data;
    },
  });
};
