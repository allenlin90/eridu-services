import { useSession } from "@eridu/auth-service/hooks/use-session";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export const useRemoveTeam = () => {
  const { authClient } = useSession();
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["remove_team"],
    mutationFn: async (...args: Parameters<typeof authClient.organization.removeTeam>) => {
      const res = await authClient.organization.removeTeam(...args);

      if (res.data) {
        queryClient.invalidateQueries({ queryKey: ["organization"] });
      }

      return res.data;
    },
  });
};
