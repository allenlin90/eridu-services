import { Briefcase, Megaphone } from 'lucide-react';

import {
  Badge,
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@eridu/ui';

import { CopyIdCell } from './copy-id-cell';
import { PlatformIcon } from './platform-icons';

export { CopyIdCell };

export function ItemsList({
  items,
  limit = 2,
  label = 'Items',
  renderItem,
}: {
  items: string[];
  limit?: number;
  label?: string;
  renderItem?: (item: string) => React.ReactNode;
}) {
  if (!items || items.length === 0)
    return <span className="text-muted-foreground">-</span>;

  const visibleItems = items.slice(0, limit);
  const remainingCount = items.length - limit;

  const renderBadge = (item: string) => (
    <Badge variant="outline" className="font-normal flex items-center">
      {renderItem ? renderItem(item) : item}
    </Badge>
  );

  return (
    <div className="flex flex-wrap gap-1 items-center">
      {visibleItems.map((item) => (
        <div key={item}>{renderBadge(item)}</div>
      ))}
      {remainingCount > 0 && (
        <Popover>
          <PopoverTrigger asChild>
            <Badge
              variant="secondary"
              className="cursor-pointer hover:bg-secondary/80 font-normal px-1.5"
            >
              +
              {remainingCount}
            </Badge>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-3 max-w-[300px]">
            <div className="space-y-2">
              <h4 className="font-medium text-sm text-muted-foreground border-b pb-1 mb-2">
                {label}
              </h4>
              <div className="flex flex-wrap gap-1">
                {items.slice(limit).map((item) => (
                  <div key={item}>{renderBadge(item)}</div>
                ))}
              </div>
            </div>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}

export function DateCell({ date }: { date: string | Date }) {
  if (!date)
    return <span className="text-muted-foreground">-</span>;

  const d = new Date(date);
  const formattedDate = d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
  const formattedTime = d.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="flex flex-col">
      <span className="font-medium text-sm">{formattedDate}</span>
      <span className="text-xs text-muted-foreground">{formattedTime}</span>
    </div>
  );
}

const statusColorMap: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  live: 'destructive',
  draft: 'secondary',
  confirmed: 'default',
  completed: 'outline',
  cancelled: 'destructive',
};

export function ShowStatusBadge({ status }: { status: string }) {
  const normalizedStatus = status?.toLowerCase() || 'unknown';

  if (normalizedStatus === 'live') {
    return (
      <Badge
        variant="outline"
        className="capitalize bg-red-100 text-red-700 border-red-200 hover:bg-red-100 hover:text-red-700"
      >
        {status}
      </Badge>
    );
  }

  const variant = statusColorMap[normalizedStatus] || 'outline';

  return (
    <Badge variant={variant} className="capitalize">
      {status}
    </Badge>
  );
}

export function ShowTypeBadge({ type }: { type?: string }) {
  const normalizedType = type?.toLowerCase() || 'bau'; // Default to BAU if unknown

  if (normalizedType === 'campaign') {
    return (
      <Badge
        variant="secondary"
        className="font-normal flex items-center bg-purple-100 text-purple-700 hover:bg-purple-100 border-purple-200"
      >
        <Megaphone className="h-3 w-3 mr-1" />
        Campaign
      </Badge>
    );
  }

  // BAU or others
  return (
    <Badge variant="outline" className="font-normal flex items-center text-muted-foreground">
      <Briefcase className="h-3 w-3 mr-1" />
      {type || 'BAU'}
    </Badge>
  );
}

export function PlatformList({ items }: { items: string[] }) {
  return (
    <ItemsList
      items={items}
      label="Platforms"
      renderItem={(item) => (
        <>
          <PlatformIcon platform={item} />
          {item}
        </>
      )}
    />
  );
}
