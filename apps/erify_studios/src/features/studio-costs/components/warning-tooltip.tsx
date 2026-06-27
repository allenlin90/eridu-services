import {
  Popover,
  PopoverContent,
  PopoverTrigger,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@eridu/ui';
import { useIsMobile } from '@eridu/ui/hooks/use-is-mobile';

export function WarningTooltip({
  trigger,
  title,
  items,
}: {
  trigger: React.ReactNode;
  title: string;
  items: string[];
}) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <Popover>
        <PopoverTrigger asChild>
          {trigger}
        </PopoverTrigger>
        <PopoverContent
          className="w-[min(calc(100vw-32px),320px)] p-3 text-xs space-y-1 bg-foreground text-background border-none break-words shadow-lg rounded-md"
          align="end"
          side="top"
          sideOffset={4}
          collisionPadding={16}
        >
          <p className="font-semibold">{title}</p>
          <ul className="list-disc pl-4 space-y-0.5">
            {items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {trigger}
        </TooltipTrigger>
        <TooltipContent
          className="max-w-xs p-3 text-xs space-y-1 bg-foreground text-background break-words"
          align="end"
          side="top"
          sideOffset={4}
          collisionPadding={16}
        >
          <p className="font-semibold">{title}</p>
          <ul className="list-disc pl-4 space-y-0.5">
            {items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
