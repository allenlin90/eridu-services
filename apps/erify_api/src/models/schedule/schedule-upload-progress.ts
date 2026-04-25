import type { ScheduleJsonValue } from './schemas/schedule.schema';

import { HttpError } from '@/lib/errors/http-error.util';
import type { ShowPlanItem } from '@/schedule-planning/schemas/schedule-planning.schema';

type UploadProgress = {
  expectedChunks: number;
  receivedChunks: number;
  lastChunkIndex?: number;
  isComplete?: boolean;
};

export type ChunkedSchedulePlanDocument = {
  metadata?: {
    uploadProgress?: UploadProgress;
    [key: string]: unknown;
  };
  shows?: ShowPlanItem[];
  [key: string]: unknown;
};

export function buildPlanDocumentWithAppendedShows(
  planDocument: ChunkedSchedulePlanDocument,
  shows: ShowPlanItem[],
  chunkIndex: number,
): ScheduleJsonValue {
  const uploadProgress = requireActiveUploadProgress(planDocument);
  validateChunkIndex(uploadProgress, chunkIndex);
  validateSequentialChunk(uploadProgress, chunkIndex);

  const updatedShows = [...(planDocument.shows || []), ...shows];
  const updatedReceivedChunks = uploadProgress.receivedChunks + 1;
  const isComplete = updatedReceivedChunks === uploadProgress.expectedChunks;

  return {
    ...planDocument,
    metadata: {
      ...planDocument.metadata,
      totalShows: updatedShows.length,
      lastEditedAt: new Date().toISOString(),
      uploadProgress: {
        expectedChunks: uploadProgress.expectedChunks,
        receivedChunks: updatedReceivedChunks,
        lastChunkIndex: chunkIndex,
        isComplete,
      },
    },
    shows: updatedShows,
  } as ScheduleJsonValue;
}

function requireActiveUploadProgress(
  planDocument: ChunkedSchedulePlanDocument,
): UploadProgress {
  if (!planDocument.metadata?.uploadProgress) {
    throw HttpError.badRequest(
      'Schedule does not have uploadProgress metadata. Cannot append shows.',
    );
  }

  const uploadProgress = planDocument.metadata.uploadProgress;

  if (uploadProgress.isComplete) {
    throw HttpError.badRequestWithDetails(
      `Upload already complete. All ${uploadProgress.expectedChunks} chunks have been received.`,
      {
        errorCode: 'UPLOAD_COMPLETE',
        uploadProgress: {
          expectedChunks: uploadProgress.expectedChunks,
          receivedChunks: uploadProgress.receivedChunks,
          lastChunkIndex: uploadProgress.lastChunkIndex,
          isComplete: true,
        },
      },
    );
  }

  return uploadProgress;
}

function validateChunkIndex(
  uploadProgress: UploadProgress,
  chunkIndex: number,
): void {
  if (chunkIndex < 1 || chunkIndex > uploadProgress.expectedChunks) {
    throw HttpError.badRequestWithDetails(
      `Invalid chunk index ${chunkIndex}. Must be between 1 and ${uploadProgress.expectedChunks}.`,
      {
        errorCode: 'INVALID_CHUNK_INDEX',
        uploadProgress: {
          expectedChunks: uploadProgress.expectedChunks,
          receivedChunks: uploadProgress.receivedChunks,
          lastChunkIndex: uploadProgress.lastChunkIndex,
          isComplete: uploadProgress.isComplete,
        },
      },
    );
  }
}

function validateSequentialChunk(
  uploadProgress: UploadProgress,
  chunkIndex: number,
): void {
  const expectedNextChunk = (uploadProgress.lastChunkIndex ?? 0) + 1;

  if (chunkIndex !== expectedNextChunk) {
    throw HttpError.conflict(
      `Chunk must be uploaded sequentially. Expected chunk ${expectedNextChunk}, but received chunk ${chunkIndex}.`,
    );
  }
}
