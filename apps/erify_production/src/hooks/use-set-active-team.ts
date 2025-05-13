import { useSession } from "@eridu/auth-service/hooks/use-session";
import { useMutation } from "@tanstack/react-query";

export const useSetActiveTeam = () => {
  const { authClient } = useSession();

  return useMutation({
    mutationKey: ["set-active-team"],
    mutationFn: async (organizationId: string) => {
      return authClient.organization.setActive({ organizationId });
    },
  });
};
