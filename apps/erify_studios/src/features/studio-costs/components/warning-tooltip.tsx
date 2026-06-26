import { useRef, useState } from 'react';

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@eridu/ui';

export function WarningTooltip({
  trigger,
  title,
  items,
}: {
  trigger: React.ReactNode;
  title: string;
  items: string[];
}) {
  const [open, setOpen] = useState(false);
  const lastOpenTime = useRef(0);

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      lastOpenTime.current = Date.now();
    }
    setOpen(nextOpen);
  };

  return (
    <TooltipProvider>
      <Tooltip open={open} onOpenChange={handleOpenChange}>
        <TooltipTrigger
          asChild
          onClick={(e) => {
            e.stopPropagation();
            if (Date.now() - lastOpenTime.current < 100) {
              return;
            }
            setOpen((prev) => !prev);
          }}
        >
          {trigger}
        </TooltipTrigger>
        <TooltipContent
          className="max-w-xs p-3 text-xs space-y-1 bg-foreground text-background break-words"
          align="end"
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
