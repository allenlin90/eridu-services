import axios from 'axios';
import { useCallback, useState } from 'react';

import type { SceneType } from '@eridu/api-types/scene-qc';
import { SCENE_TYPE } from '@eridu/api-types/scene-qc';

import { useSceneProfileQuery } from '../api/get-scene-profile';
import { useRetireSceneProfile } from '../api/retire-scene-profile';
import { useSaveSceneProfile } from '../api/save-scene-profile';
import { type UploadedSceneReference, uploadSceneReference } from '../lib/upload-scene-reference';

import { getMutationErrorMessage } from '@/features/studio-shows/lib/get-mutation-error-message';

function isNotFound(error: unknown): boolean {
  return axios.isAxiosError(error) && error.response?.status === 404;
}

function isConflict(error: unknown): boolean {
  return axios.isAxiosError(error) && error.response?.status === 409;
}

/**
 * Controller hook for the Scene Profile editor. Owns:
 *   - normalizing a 404 (the backend's "no active Scene Profile" contract --
 *     see the resolved judgment call in plan section 11.3) into a
 *     `hasNoProfile: true` client-side empty state, not an error;
 *   - the two-phase upload-then-save pipeline (upload keeps state on a 409 so
 *     a retry after refresh does not re-upload);
 *   - 409 conflict UX: preserves the selected scene type + already-uploaded
 *     file metadata, surfaces a dismissible message, never auto-retries.
 */
export function useSceneProfileEditor(studioId: string, clientId: string | undefined) {
  const profileQuery = useSceneProfileQuery(studioId, clientId);
  const saveMutation = useSaveSceneProfile(studioId, clientId);
  const retireMutation = useRetireSceneProfile(studioId, clientId);

  const [sceneType, setSceneType] = useState<SceneType>(SCENE_TYPE.GRAPHIC_BG);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploaded, setUploaded] = useState<UploadedSceneReference | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [conflictMessage, setConflictMessage] = useState<string | null>(null);

  const hasNoProfile = isNotFound(profileQuery.error);
  const loadError = !hasNoProfile && profileQuery.isError ? profileQuery.error : null;
  const profile = profileQuery.data ?? null;

  const selectFile = useCallback(async (file: File) => {
    setUploadError(null);
    setSelectedFile(file);
    setIsUploading(true);
    try {
      const result = await uploadSceneReference(file);
      setUploaded(result);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Failed to upload reference image');
      setUploaded(null);
    } finally {
      setIsUploading(false);
    }
  }, []);

  const clearFile = useCallback(() => {
    setSelectedFile(null);
    setUploaded(null);
    setUploadError(null);
  }, []);

  const dismissConflict = useCallback(() => {
    setConflictMessage(null);
  }, []);

  const save = useCallback(async () => {
    if (!uploaded) {
      return;
    }
    setConflictMessage(null);
    try {
      await saveMutation.mutateAsync({
        object_key: uploaded.object_key,
        file_url: uploaded.file_url,
        mime_type: uploaded.mime_type,
        file_size: uploaded.file_size,
        scene_type: sceneType,
        version: profile?.version,
      });
      // A successful save consumed this upload -- clear the local file state
      // so the form reflects the freshly-saved profile from the refetch.
      setSelectedFile(null);
      setUploaded(null);
    } catch (err) {
      if (isConflict(err)) {
        // Keep selected scene type + already-uploaded object key in local
        // state (do NOT reset the form). Refetch so the retry has the
        // current version, then let the operator explicitly retry.
        setConflictMessage(getMutationErrorMessage(err, 'This Scene Profile changed since you loaded it.'));
        void profileQuery.refetch();
        return;
      }
      throw err;
    }
  }, [uploaded, sceneType, profile?.version, saveMutation, profileQuery]);

  const retire = useCallback(async () => {
    setConflictMessage(null);
    try {
      await retireMutation.mutateAsync(profile?.version);
    } catch (err) {
      if (isConflict(err)) {
        setConflictMessage(getMutationErrorMessage(err, 'This Scene Profile changed since you loaded it.'));
        void profileQuery.refetch();
        return;
      }
      throw err;
    }
  }, [profile?.version, retireMutation, profileQuery]);

  return {
    profile,
    hasNoProfile,
    isLoading: profileQuery.isLoading,
    loadError,
    sceneType,
    setSceneType,
    selectedFile,
    selectFile,
    clearFile,
    save,
    retire,
    isUploading,
    isSaving: saveMutation.isPending,
    isRetiring: retireMutation.isPending,
    uploadError,
    conflictMessage,
    dismissConflict,
    canSave: uploaded !== null && !isUploading,
  };
}
