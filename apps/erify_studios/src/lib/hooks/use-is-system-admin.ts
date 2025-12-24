import { useUserProfile } from './use-user';

export function useIsSystemAdmin() {
  const { data: user, isLoading } = useUserProfile();

  return {
    isSystemAdmin: user?.is_system_admin ?? false,
    isLoading,
  };
}
