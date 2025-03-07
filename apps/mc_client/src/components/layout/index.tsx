import { useSession } from '@/auth/hooks/use-session';
import { LoaderCircle } from 'lucide-react';
import { Outlet } from 'react-router';

export const Layout: React.FC<React.PropsWithChildren> = () => {
  const { isLoaded } = useSession();

  if (!isLoaded) {
    return (
      <div className='h-screen w-screen flex justify-center items-center'>
        <LoaderCircle className='animate-spin' />
      </div>
    );
  }

  return <Outlet />;
};
