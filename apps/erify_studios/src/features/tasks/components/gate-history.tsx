import type { StudioShowStateGate } from '@eridu/api-types/shows';

const EVENT_LABEL: Record<string, string> = {
  opened: 'Opened',
  claimed: 'Claimed',
  reassigned: 'Reassigned',
  resolved: 'Resolved',
};

type GateHistoryProps = {
  history: NonNullable<StudioShowStateGate>['history'];
};

export function GateHistory({ history }: GateHistoryProps) {
  if (history.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2 rounded-md border bg-muted/30 p-3 text-sm">
      <h3 className="font-medium">Gate History</h3>
      <ol className="space-y-1.5">
        {history.map((entry) => (
          <li
            key={`${entry.event}-${entry.at}-${entry.actor_id ?? 'system'}-${entry.note ?? ''}`}
            className="text-muted-foreground"
          >
            <span className="font-medium text-foreground">{EVENT_LABEL[entry.event] ?? entry.event}</span>
            {' · '}
            {new Date(entry.at).toLocaleString()}
            {entry.actor_id ? ` · ${entry.actor_id}` : ''}
            {entry.note ? <p className="mt-0.5 text-foreground">{entry.note}</p> : null}
          </li>
        ))}
      </ol>
    </div>
  );
}
