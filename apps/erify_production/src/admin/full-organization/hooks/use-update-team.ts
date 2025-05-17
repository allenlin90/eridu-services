import { useSession } from "@eridu/auth-service/hooks/use-session";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export const useUpdateTeam = () => {
  const { authClient } = useSession();
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["update_team"],
    mutationFn: async (...args: Parameters<typeof authClient.organization.updateTeam>) => {
      const res = await authClient.organization.updateTeam(...args);

      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["organization"] });
    },
  });
};

export default useUpdateTeam;
