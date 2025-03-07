import { useUser } from '@clerk/clerk-react';

export const useSession = (): ReturnType<typeof useUser> => {
  return useUser();
};

export default useSession;
