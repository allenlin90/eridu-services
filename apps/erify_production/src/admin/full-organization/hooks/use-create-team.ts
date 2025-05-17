import { useSession } from "@eridu/auth-service/hooks/use-session";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export const useCreateTeam = () => {
  const { authClient } = useSession();
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["create_team"],
    mutationFn: async (...args: Parameters<typeof authClient.organization.createTeam>) => {
      const res = await authClient.organization.createTeam(...args);

      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["organization"] });
    },
  });
};

export default useCreateTeam;
