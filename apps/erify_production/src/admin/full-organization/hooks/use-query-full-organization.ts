import { useSession } from "@eridu/auth-service/hooks/use-session";
import { useQuery } from "@tanstack/react-query";

export const useQueryFullOrganization = () => {
  const { authClient, session } = useSession();

  return useQuery({
    queryKey: ["organization", session?.activeOrganizationId],
    queryFn: async () => {
      const res = await authClient.organization.getFullOrganization();

      return res.data;
    },
    refetchOnWindowFocus: false,
  });
};

export default useQueryFullOrganization;
