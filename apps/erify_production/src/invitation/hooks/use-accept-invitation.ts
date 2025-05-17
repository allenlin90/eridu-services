import useSession from "@eridu/auth-service/hooks/use-session";
import { useMutation } from "@tanstack/react-query";

export const useAcceptInvitation = () => {
  const { authClient } = useSession();

  return useMutation({
    mutationKey: ["accept_invitation"],
    mutationFn: async ({ invitationId }: { invitationId: string }) => {
      const res = await authClient.organization.acceptInvitation({ invitationId });

      return res.data;
    },
  });
};
