import { Copy } from 'lucide-react';
import { useState } from 'react';

import {
  Button,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@eridu/ui';

export function CopyIdCell({ id }: { id: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex items-center gap-1.5 min-w-0 w-fit max-w-[400px]">
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className="font-mono text-xs text-muted-foreground truncate min-w-0 transition-colors cursor-default"
          >
            {id}
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="font-mono">
          {id}
        </TooltipContent>
      </Tooltip>
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6 transition-all shrink-0 text-muted-foreground/50 hover:text-primary hover:bg-primary/10"
        onClick={handleCopy}
        title="Copy ID"
      >
        {copied
          ? (
              <span className="text-xs font-bold text-green-500">✓</span>
            )
          : (
              <Copy className="h-3 w-3" />
            )}
      </Button>
    </div>
  );
}
