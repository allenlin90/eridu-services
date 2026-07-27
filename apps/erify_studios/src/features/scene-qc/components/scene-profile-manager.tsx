import { AsyncCombobox, Card, CardContent, CardHeader, CardTitle } from '@eridu/ui';

import { useSceneProfileClientOptions } from '../hooks/use-scene-profile-client-options';
import { useSceneProfileEditor } from '../hooks/use-scene-profile-editor';

import { SceneProfileEditorCard } from './scene-profile-editor-card';
import { SceneProfileEmptyState } from './scene-profile-empty-state';

import { getMutationErrorMessage } from '@/features/studio-shows/lib/get-mutation-error-message';
import * as m from '@/paraglide/messages';

type SceneProfileManagerProps = {
  studioId: string;
  clientId: string | undefined;
  onClientChange: (clientId: string | undefined) => void;
};

export function SceneProfileManager({ studioId, clientId, onClientChange }: SceneProfileManagerProps) {
  const { clientOptions, isLoading: isClientsLoading, setClientSearch } = useSceneProfileClientOptions(studioId, clientId);
  const editor = useSceneProfileEditor(studioId, clientId);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>{m.scene_profiles_select_client()}</CardTitle>
        </CardHeader>
        <CardContent>
          <AsyncCombobox
            className="w-[300px]"
            value={clientId ?? ''}
            onChange={(val) => onClientChange(val || undefined)}
            onSearch={setClientSearch}
            options={clientOptions}
            isLoading={isClientsLoading}
            placeholder="Choose a client..."
          />
        </CardContent>
      </Card>

      {!clientId && (
        <div className="flex h-[160px] items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground">
          {m.scene_profiles_select_client()}
        </div>
      )}

      {clientId && editor.conflictMessage && (
        <div className="flex items-center justify-between rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          <span>{editor.conflictMessage}</span>
          <button type="button" className="underline" onClick={editor.dismissConflict}>
            Dismiss
          </button>
        </div>
      )}

      {clientId && editor.loadError && (
        <p className="text-sm text-destructive">
          {getMutationErrorMessage(editor.loadError, 'Unable to load Scene Profile.')}
        </p>
      )}

      {clientId && editor.isLoading && (
        <div className="flex h-[160px] items-center justify-center rounded-md border text-sm text-muted-foreground">
          Loading...
        </div>
      )}

      {clientId && !editor.isLoading && !editor.loadError && editor.hasNoProfile && (
        <SceneProfileEmptyState
          sceneType={editor.sceneType}
          onSceneTypeChange={editor.setSceneType}
          selectedFile={editor.selectedFile}
          onSelectFile={editor.selectFile}
          onSave={editor.save}
          isUploading={editor.isUploading}
          isSaving={editor.isSaving}
          canSave={editor.canSave}
          uploadError={editor.uploadError}
        />
      )}

      {clientId && !editor.isLoading && !editor.loadError && !editor.hasNoProfile && editor.profile && (
        <SceneProfileEditorCard
          profile={editor.profile}
          sceneType={editor.sceneType}
          onSceneTypeChange={editor.setSceneType}
          selectedFile={editor.selectedFile}
          onSelectFile={editor.selectFile}
          onSave={editor.save}
          onRetire={editor.retire}
          isUploading={editor.isUploading}
          isSaving={editor.isSaving}
          isRetiring={editor.isRetiring}
          canSave={editor.canSave}
          uploadError={editor.uploadError}
        />
      )}
    </div>
  );
}
