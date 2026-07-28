import type { SceneQcExpectedReference } from '@eridu/api-types/scene-qc';

import { SceneQcImageFrame } from './scene-qc-image-frame';

type SceneQcExpectedReferencePanelProps = {
  sceneProfile: SceneQcExpectedReference | null;
};

const SCENE_TYPE_LABEL: Record<SceneQcExpectedReference['scene_type'], string> = {
  GRAPHIC_BG: 'Graphic BG',
  REAL_BACKDROP: 'Real Backdrop',
};

/** Expected side of the comparison. Missing profile: warning above an empty panel; review remains enabled. */
export function SceneQcExpectedReferencePanel({ sceneProfile }: SceneQcExpectedReferencePanelProps) {
  if (!sceneProfile) {
    return (
      <div className="space-y-2">
        <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-300">
          No Scene Profile set for this Client. Review can still proceed.
        </div>
        <div className="flex min-h-[16rem] items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
          No expected reference image
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <SceneQcImageFrame key={sceneProfile.file_url} src={sceneProfile.file_url} alt="Expected scene reference" />
      <p className="text-xs text-muted-foreground">{SCENE_TYPE_LABEL[sceneProfile.scene_type]}</p>
    </div>
  );
}
