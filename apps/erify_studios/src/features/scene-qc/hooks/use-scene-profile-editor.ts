import axios from 'axios';
import { useCallback, useEffect, useRef, useState } from 'react';

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

  // "Latest ref" so an in-flight upload started for one Client can detect
  // that the operator has since switched to a different Client and discard
  // its result, instead of attaching a stale draft to the new Client.
  const clientIdRef = useRef(clientId);
  clientIdRef.current = clientId;

  // Client changed: discard any in-progress draft. Without this, an upload
  // started for Client A (and its selected scene type) would remain
  // attachable to a `save()` call against Client B. Also clears isUploading:
  // an in-flight upload's own completion is guarded against updating state
  // for a Client it was no longer started for (see selectFile), so nothing
  // else would ever clear this flag.
  useEffect(() => {
    setSelectedFile(null);
    setUploaded(null);
    setUploadError(null);
    setConflictMessage(null);
    setIsUploading(false);
  }, [clientId]);

  // Initialize/sync the displayed scene type from the loaded profile whenever
  // the Client changes or the profile (re)loads -- but never while the
  // operator has a draft in progress (a selected or already-uploaded file),
  // so a 409-retry refetch cannot silently overwrite an in-flight choice.
  // Without this, sceneType always started at GRAPHIC_BG even for an
  // existing REAL_BACKDROP profile, and the next save would silently change
  // its type back.
  useEffect(() => {
    if (selectedFile || uploaded) {
      return;
    }
    setSceneType(profile?.scene_type ?? SCENE_TYPE.GRAPHIC_BG);
  }, [clientId, profile?.scene_type, selectedFile, uploaded]);

  const selectFile = useCallback(async (file: File) => {
    const targetClientId = clientIdRef.current;
    setUploadError(null);
    setSelectedFile(file);
    setIsUploading(true);
    try {
      const result = await uploadSceneReference(file);
      if (clientIdRef.current !== targetClientId) {
        // The operator switched Clients while this upload was in flight --
        // the client-change effect above already reset the draft; discard
        // this result rather than attaching it to the new Client's draft.
        return;
      }
      setUploaded(result);
    } catch (err) {
      if (clientIdRef.current === targetClientId) {
        setUploadError(err instanceof Error ? err.message : 'Failed to upload reference image');
        setUploaded(null);
      }
    } finally {
      if (clientIdRef.current === targetClientId) {
        setIsUploading(false);
      }
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
    if (!profile) {
      return;
    }
    setConflictMessage(null);
    try {
      await retireMutation.mutateAsync(profile.version);
    } catch (err) {
      if (isConflict(err)) {
        setConflictMessage(getMutationErrorMessage(err, 'This Scene Profile changed since you loaded it.'));
        void profileQuery.refetch();
        return;
      }
      throw err;
    }
  }, [profile, retireMutation, profileQuery]);

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
