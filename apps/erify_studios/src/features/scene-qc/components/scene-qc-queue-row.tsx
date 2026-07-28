import type { SceneQcDailyItem } from '@eridu/api-types/scene-qc';
import { Badge } from '@eridu/ui';
import { cn } from '@eridu/ui/lib/utils';

type SceneQcQueueRowProps = {
  item: SceneQcDailyItem;
  selected: boolean;
  onSelect: (showId: string) => void;
};

type StateChip = { label: string; className: string };

function resolveStateChip(item: SceneQcDailyItem): StateChip {
  if (item.is_blocked) {
    return { label: 'Blocked', className: 'bg-muted text-muted-foreground' };
  }
  if (item.result === 'PASS') {
    return { label: 'Pass', className: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300' };
  }
  if (item.result === 'MINOR') {
    return { label: 'Minor', className: 'bg-amber-500/15 text-amber-700 dark:text-amber-300' };
  }
  if (item.result === 'FAIL') {
    return { label: 'Fail', className: 'bg-destructive/15 text-destructive' };
  }
  return { label: 'Unreviewed', className: 'bg-muted text-muted-foreground' };
}

/** §7.2 (5 left): scheduled time, Show, Client, platforms, evidence count, one state chip -- text label plus color (§7.8). */
export function SceneQcQueueRow({ item, selected, onSelect }: SceneQcQueueRowProps) {
  const chip = resolveStateChip(item);

  return (
    <button
      type="button"
      aria-current={selected ? 'true' : undefined}
      onClick={() => onSelect(item.show_id)}
      className={cn(
        'flex w-full flex-col gap-1 rounded-lg border p-2.5 text-left transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        selected && 'border-primary bg-primary/5',
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-sm font-semibold">{item.show_name}</span>
        <Badge variant="outline" className={cn('shrink-0', chip.className)}>{chip.label}</Badge>
      </div>
      <p className="text-xs text-muted-foreground">
        {new Date(item.scheduled_start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        {item.client ? ` · ${item.client.name}` : ''}
      </p>
      <p className="truncate text-xs text-muted-foreground">
        {item.platforms.map((platform) => platform.name).join(', ') || 'No platform'}
        {' · '}
        {item.evidence_count}
        {' '}
        evidence
      </p>
    </button>
  );
}
