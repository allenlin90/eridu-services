import { useSession } from "@eridu/auth-service/hooks/use-session";
import { useMutation } from "@tanstack/react-query";

export const useRejectInvitation = () => {
  const { authClient } = useSession();

  return useMutation({
    mutationKey: ["reject_invitation"],
    mutationFn: async ({ invitationId }: { invitationId: string }) => {
      const res = await authClient.organization.rejectInvitation({ invitationId });

      return res.data;
    },
  });
};
