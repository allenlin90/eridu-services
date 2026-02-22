import { cn } from '@eridu/ui/lib/utils';

type ProgressBarProps = {
  value: number; // 0 to 100
  className?: string;
  indicatorClassName?: string;
};

export function ProgressBar({ value, className, indicatorClassName }: ProgressBarProps) {
  const percentage = Math.min(100, Math.max(0, value));

  return (
    <div
      className={cn(
        'h-2 w-full overflow-hidden rounded-full bg-slate-100',
        className,
      )}
    >
      <div
        className={cn(
          'h-full w-full flex-1 bg-primary transition-all duration-300 ease-in-out',
          indicatorClassName,
        )}
        style={{ transform: `translateX(-${100 - percentage}%)` }}
      />
    </div>
  );
}
