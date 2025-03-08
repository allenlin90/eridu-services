import { useSession } from '@/auth/hooks/use-session';
import { LoaderCircle } from 'lucide-react';
import { Outlet } from 'react-router';

import { NavLayout } from './nav-layout';

export const Layout: React.FC<React.PropsWithChildren> = () => {
  const { isLoaded, isSignedIn } = useSession();

  if (!isLoaded) {
    return (
      <div className='h-screen w-screen flex justify-center items-center'>
        <LoaderCircle className='animate-spin' />
      </div>
    );
  }

  if (isSignedIn) {
    return (
      <NavLayout>
        <Outlet />
      </NavLayout>
    );
  }

  return <Outlet />;
};
