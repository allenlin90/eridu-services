import type { CancellationHistoryEntry } from '@eridu/api-types/shows';

const EVENT_LABEL: Record<CancellationHistoryEntry['event'], string> = {
  opened: 'Opened',
  resolved: 'Resolved',
};

type GateHistoryProps = {
  history: CancellationHistoryEntry[];
};

export function GateHistory({ history }: GateHistoryProps) {
  if (history.length === 0) {
    return null;
  }

  return (
    <ul className="space-y-2 text-sm">
      {history.map((entry) => (
        <li
          key={`${entry.event}-${entry.at}-${entry.actor?.uid ?? 'system'}-${entry.outcome ?? 'pending'}`}
          className="border-l-2 pl-2"
        >
          <p className="font-medium">
            <span>{EVENT_LABEL[entry.event]}</span>
            {entry.outcome ? <span>{` — ${entry.outcome}`}</span> : null}
          </p>
          <p className="text-muted-foreground">
            <span>{entry.actor?.name ?? 'System'}</span>
            {' · '}
            <span>{new Date(entry.at).toLocaleString()}</span>
          </p>
          {entry.note ? <p>{entry.note}</p> : null}
        </li>
      ))}
    </ul>
  );
}
