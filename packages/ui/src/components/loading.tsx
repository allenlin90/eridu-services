import { cn } from '../lib/utils';

import { Spinner } from './ui/spinner';

type LoadingSpinnerProps = {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
};

const sizeClasses = {
  sm: 'size-4',
  md: 'size-8',
  lg: 'size-12',
};

/**
 * Loading Spinner Component
 *
 * A reusable loading spinner that can be used throughout the application.
 */
export function LoadingSpinner({
  className,
  size = 'md',
}: LoadingSpinnerProps) {
  return (
    <div className={cn('flex items-center justify-center p-8', className)}>
      <Spinner className={sizeClasses[size]} />
    </div>
  );
}

/**
 * Loading Page Component
 *
 * A full-page loading indicator, typically used for route-level loading states.
 */
export function LoadingPage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <Spinner className="size-8" />
    </div>
  );
}
