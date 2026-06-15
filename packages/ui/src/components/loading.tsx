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

type LoadingPageProps = {
  /** Optional caption rendered under the spinner (e.g. "Loading builder…"). */
  label?: string;
  /**
   * Overrides the default `min-h-screen` height. Pass a content-area height
   * (e.g. `min-h-[calc(100vh-13rem)]`) when the loader fills a page region
   * inside a layout rather than the whole viewport — useful as a `Suspense`
   * fallback for a lazily-loaded section.
   */
  className?: string;
};

/**
 * Loading Page Component
 *
 * A full-page loading indicator for route-level loading states and `Suspense`
 * fallbacks. Defaults to filling the viewport; pass `className` to fit a smaller
 * region and `label` to caption it. The `Spinner` already exposes
 * `role="status"`/`aria-label="Loading"` for assistive tech.
 */
export function LoadingPage({ label, className }: LoadingPageProps = {}) {
  return (
    <div className={cn('flex min-h-screen flex-col items-center justify-center gap-3', className)}>
      <Spinner className="size-8" />
      {label ? <p className="text-sm text-muted-foreground">{label}</p> : null}
    </div>
  );
}
