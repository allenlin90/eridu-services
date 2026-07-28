import { ImageOff } from 'lucide-react';
import { useState } from 'react';

import type { SceneQcEvidence, SceneQcExpectedReference } from '@eridu/api-types/scene-qc';

import { SceneQcEvidenceSelector } from './scene-qc-evidence-selector';
import { SceneQcExpectedReferencePanel } from './scene-qc-expected-reference-panel';
import { SceneQcImageFrame } from './scene-qc-image-frame';

type SceneQcEvidenceComparisonProps = {
  evidence: SceneQcEvidence[];
  sceneProfile: SceneQcExpectedReference | null;
};

/**
 * §7.2 (6): desktop side-by-side Live vs Expected. Switching either side
 * never changes the current result form.
 *
 * Callers must render with `key={showId}` (the standard React "reset state
 * via key" pattern) so a Show change remounts a fresh instance -- with
 * `selectedIndex` back at 0 -- instead of needing a `useEffect`.
 */
export function SceneQcEvidenceComparison({ evidence, sceneProfile }: SceneQcEvidenceComparisonProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const active = evidence[Math.min(selectedIndex, Math.max(evidence.length - 1, 0))];

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Live evidence</p>
        {active
          ? <SceneQcImageFrame key={active.file_url} src={active.file_url} alt={active.label} />
          : (
              <div className="flex min-h-[16rem] flex-col items-center justify-center gap-2 rounded-lg border border-dashed text-sm text-muted-foreground">
                <ImageOff className="h-6 w-6" />
                No evidence
              </div>
            )}
        <SceneQcEvidenceSelector evidence={evidence} selectedIndex={selectedIndex} onSelect={setSelectedIndex} />
        {active ? <p className="truncate text-sm text-muted-foreground">{active.label}</p> : null}
      </div>
      <div className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Expected reference</p>
        <SceneQcExpectedReferencePanel sceneProfile={sceneProfile} />
      </div>
    </div>
  );
}
