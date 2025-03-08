import { UserButton } from '@clerk/clerk-react';

export const NavLayout: React.FC<React.PropsWithChildren> = ({ children }) => {
  return (
    <div className='h-screen w-screen relative'>
      <nav className='fixed top-0 left-0 w-full h-12 flex justify-between items-center p-2 backdrop-blur-sm'>
        <div />
        <UserButton />
      </nav>
      <div className='w-full h-12' />
      {children}
    </div>
  );
};
