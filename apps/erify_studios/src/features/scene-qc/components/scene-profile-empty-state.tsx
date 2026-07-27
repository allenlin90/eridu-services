import type { SceneType } from '@eridu/api-types/scene-qc';
import { SCENE_TYPE } from '@eridu/api-types/scene-qc';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
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

type SceneProfileEmptyStateProps = {
  sceneType: SceneType;
  onSceneTypeChange: (next: SceneType) => void;
  selectedFile: File | null;
  onSelectFile: (file: File) => void;
  onSave: () => void;
  isUploading: boolean;
  isSaving: boolean;
  canSave: boolean;
  uploadError: string | null;
};

export function SceneProfileEmptyState({
  sceneType,
  onSceneTypeChange,
  selectedFile,
  onSelectFile,
  onSave,
  isUploading,
  isSaving,
  canSave,
  uploadError,
}: SceneProfileEmptyStateProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{m.scene_profiles_empty_title()}</CardTitle>
        <CardDescription>{m.scene_profiles_empty_description()}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="scene-profile-file-empty">{selectedFile ? selectedFile.name : m.scene_profiles_upload_action()}</Label>
          <input
            id="scene-profile-file-empty"
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
            onClick={() => document.getElementById('scene-profile-file-empty')?.click()}
          >
            {isUploading ? 'Uploading...' : m.scene_profiles_upload_action()}
          </Button>
          {uploadError && <p className="text-sm text-destructive">{uploadError}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="scene-profile-type-empty">{m.scene_profiles_scene_type_label()}</Label>
          <Select value={sceneType} onValueChange={(v) => onSceneTypeChange(v as SceneType)}>
            <SelectTrigger id="scene-profile-type-empty">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={SCENE_TYPE.GRAPHIC_BG}>{m.scene_profiles_scene_type_graphic_bg()}</SelectItem>
              <SelectItem value={SCENE_TYPE.REAL_BACKDROP}>{m.scene_profiles_scene_type_real_backdrop()}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardContent>
      <CardFooter className="justify-end">
        <Button type="button" onClick={onSave} disabled={!canSave || isSaving}>
          {isSaving ? 'Saving...' : m.scene_profiles_save_action()}
        </Button>
      </CardFooter>
    </Card>
  );
}
