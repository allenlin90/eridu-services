import { useState } from 'react';

import type { SceneProfileApiResponse, SceneType } from '@eridu/api-types/scene-qc';
import { SCENE_TYPE } from '@eridu/api-types/scene-qc';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Button,
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@eridu/ui';

import * as m from '@/paraglide/messages';

/**
 * Owns its own failed-to-load state, keyed by the parent on `fileUrl` --
 * remounting on a new URL resets `imageFailed` for free (React's own
 * recommended "resetting state when a prop changes" pattern) instead of an
 * effect that calls `setState`, which the react-hooks lint rule flags as a
 * cascading-render risk. Without SOME reset mechanism, one failed preview
 * would stay "unavailable" for every subsequently loaded/replaced profile.
 */
function SceneProfileReferenceImage({ fileUrl, alt }: { fileUrl: string; alt: string }) {
  const [imageFailed, setImageFailed] = useState(false);

  if (imageFailed) {
    return <p className="py-8 text-sm text-muted-foreground">{m.scene_profiles_preview_unavailable()}</p>;
  }

  return (
    <img
      src={fileUrl}
      alt={alt}
      className="max-h-64 rounded-md object-contain"
      onError={() => setImageFailed(true)}
    />
  );
}

type SceneProfileEditorCardProps = {
  profile: SceneProfileApiResponse;
  sceneType: SceneType;
  onSceneTypeChange: (next: SceneType) => void;
  selectedFile: File | null;
  onSelectFile: (file: File) => void;
  onSave: () => void;
  onRetire: () => void;
  isUploading: boolean;
  isSaving: boolean;
  isRetiring: boolean;
  canSave: boolean;
  uploadError: string | null;
};

export function SceneProfileEditorCard({
  profile,
  sceneType,
  onSceneTypeChange,
  selectedFile,
  onSelectFile,
  onSave,
  onRetire,
  isUploading,
  isSaving,
  isRetiring,
  canSave,
  uploadError,
}: SceneProfileEditorCardProps) {
  const [retireOpen, setRetireOpen] = useState(false);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{m.scene_profiles_title()}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-center rounded-md border bg-muted/30 p-2">
          <SceneProfileReferenceImage key={profile.file_url} fileUrl={profile.file_url} alt={m.scene_profiles_title()} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="scene-profile-file">{selectedFile ? selectedFile.name : m.scene_profiles_replace_action()}</Label>
          <input
            id="scene-profile-file"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                onSelectFile(file);
              }
            }}
          />
          <Button
            type="button"
            variant="outline"
            disabled={isUploading}
            onClick={() => document.getElementById('scene-profile-file')?.click()}
          >
            {isUploading ? 'Uploading...' : m.scene_profiles_replace_action()}
          </Button>
          {uploadError && <p className="text-sm text-destructive">{uploadError}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="scene-profile-type">{m.scene_profiles_scene_type_label()}</Label>
          <Select value={sceneType} onValueChange={(v) => onSceneTypeChange(v as SceneType)}>
            <SelectTrigger id="scene-profile-type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={SCENE_TYPE.GRAPHIC_BG}>{m.scene_profiles_scene_type_graphic_bg()}</SelectItem>
              <SelectItem value={SCENE_TYPE.REAL_BACKDROP}>{m.scene_profiles_scene_type_real_backdrop()}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <p className="text-xs text-muted-foreground">
          v
          {profile.version}
        </p>
      </CardContent>
      <CardFooter className="flex items-center justify-between">
        <Button type="button" variant="destructive" onClick={() => setRetireOpen(true)} disabled={isRetiring}>
          {m.scene_profiles_retire_action()}
        </Button>
        <Button type="button" onClick={onSave} disabled={!canSave || isSaving}>
          {isSaving ? 'Saving...' : m.scene_profiles_save_action()}
        </Button>
      </CardFooter>

      <AlertDialog open={retireOpen} onOpenChange={setRetireOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{m.scene_profiles_retire_confirm_title()}</AlertDialogTitle>
            <AlertDialogDescription>{m.scene_profiles_retire_confirm_description()}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isRetiring}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                onRetire();
                setRetireOpen(false);
              }}
              disabled={isRetiring}
            >
              {m.scene_profiles_retire_action()}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
