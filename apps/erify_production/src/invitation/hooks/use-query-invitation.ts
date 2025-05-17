import { useSession } from "@eridu/auth-service/hooks/use-session";
import { useQuery } from "@tanstack/react-query";

export const useQueryInvitation = ({ invitationId }: { invitationId?: string }) => {
  const { authClient } = useSession();

  return useQuery({
    queryKey: ["invitation", invitationId],
    queryFn: async () => {
      const res = await authClient
        .organization
        .getInvitation({
          query: {
            id: invitationId!,
          },
        });

      return res.data;
    },
    refetchOnWindowFocus: false,
    enabled: !!invitationId,
  });
};

export default useQueryInvitation;
