import type { SceneQcEvidence } from '@eridu/api-types/scene-qc';
import { cn } from '@eridu/ui/lib/utils';

type SceneQcEvidenceSelectorProps = {
  evidence: SceneQcEvidence[];
  selectedIndex: number;
  onSelect: (index: number) => void;
};

/** Thumbnail strip + labels for the Live evidence side, keyboard reachable. */
export function SceneQcEvidenceSelector({ evidence, selectedIndex, onSelect }: SceneQcEvidenceSelectorProps) {
  if (evidence.length <= 1) {
    return null;
  }

  return (
    <div className="flex gap-2 overflow-x-auto pb-1" aria-label="Evidence images">
      {evidence.map((item, index) => (
        <button
          key={`${item.source_task_id}:${item.source_field_key}`}
          type="button"
          className={cn(
            'h-16 w-12 shrink-0 overflow-hidden rounded border-2 bg-muted',
            index === selectedIndex ? 'border-primary' : 'border-transparent',
          )}
          onClick={() => onSelect(index)}
          aria-label={`View ${item.label}`}
          aria-current={index === selectedIndex ? 'true' : undefined}
        >
          <img src={item.file_url} alt="" className="h-full w-full object-cover" />
        </button>
      ))}
    </div>
  );
}
