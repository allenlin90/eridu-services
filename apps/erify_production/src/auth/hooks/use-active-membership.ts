import useSession from "@eridu/auth-service/hooks/use-session";

export const useActiveMembership = () => {
  const { session } = useSession();

  return session.memberships[0];
};
