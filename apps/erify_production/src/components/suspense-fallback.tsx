import { Skeleton } from "@eridu/ui/components/skeleton";
import { cn } from "@eridu/ui/lib/utils";

export const SuspenseFallback: React.FC = ({ className, ...props }: React.ComponentProps<typeof Skeleton>) => {
  return (
    <div className="flex-1 h-full p-4">
      <Skeleton className={cn("w-full h-full", className)} {...props} />
    </div>
  );
};
