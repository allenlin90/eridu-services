import type { ControllerRenderProps, FieldValues } from 'react-hook-form';

import type { UiSchema } from '@/lib/zod-schema-builder';

export type JsonFormProps = {
  schema: UiSchema;
  values?: Record<string, unknown>;
  onChange?: (values: Record<string, unknown>) => void;
  onSubmit?: (values: Record<string, unknown>) => void;
  readOnly?: boolean;
  activeGroup?: string;
  uploadTaskId?: string;
  onUploadStateChange?: (state: JsonFormUploadState) => void;
};

export type JsonFormUploadState = {
  hasPendingUploads: boolean;
  hasBlockingIssues: boolean;
  isPreparingUploads: boolean;
  blockingMessages: string[];
};

export type JsonFormHandle = {
  validateBeforeSubmit: () => Promise<void>;
  flushPendingFileUploads: () => Promise<Record<string, unknown>>;
  hasPendingFileUploads: () => boolean;
  hasBlockingFileIssues: () => boolean;
  clearUploadedFileCache: () => void;
};

export type PendingUpload = {
  file: File;
  previewUrl: string | null;
  error: string | null;
  isPreparing: boolean;
};

export type UploadedFileCacheEntry = {
  fingerprint: string;
  fileUrl: string;
  uploadTaskId: string;
};

export type FieldRendererProps = {
  item: UiSchema['items'][0];
  field: ControllerRenderProps<FieldValues, string>;
  readOnly?: boolean;
  isUploading?: boolean;
  pendingUpload?: PendingUpload;
  onClearPendingUpload?: () => void;
  onClearCurrentUpload?: () => void;
  onFileSelect?: (file: File) => Promise<void> | void;
};
