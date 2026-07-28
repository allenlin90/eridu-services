import { ImageOff } from 'lucide-react';

/** Replaces the result form when a Show has no Scene QC evidence -- no Pass/Minor/Fail controls (§7.3). */
export function SceneQcBlockedPanel() {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed p-6 text-center">
      <ImageOff className="h-8 w-8 text-muted-foreground" />
      <p className="font-medium">No Scene QC evidence yet</p>
      <p className="text-sm text-muted-foreground">
        This Show has no image designated as Scene QC evidence in its Task Template. Add an
        evidence-designated image field before this Show can be reviewed.
      </p>
    </div>
  );
}
