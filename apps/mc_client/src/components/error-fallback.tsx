import type { FallbackProps } from 'react-error-boundary';

import { Button } from '@eridu/ui/components/button';
import React from 'react';
import { NavLink } from 'react-router';

export const ErrorFallback: React.FC<FallbackProps> = ({
  error,
  resetErrorBoundary,
}) => {
  return (
    <div className='h-screen w-full'>
      <h1>Something went wrong...</h1>
      <div>
        <p>{error?.message}</p>
      </div>
      <Button onClick={resetErrorBoundary}>
        <NavLink to='/'>Refresh</NavLink>
      </Button>
    </div>
  );
};

export default ErrorFallback;
