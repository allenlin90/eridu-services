/**
 * Pure helpers + upload policy constants for JsonForm and its field renderers:
 * MIME/size policy, image-preview heuristics, file-size formatting, and the
 * extra-data humanization used to render read-only "Extra for …" blocks. No
 * React state — see json-form.tsx for the stateful form.
 */
import {
  FILE_UPLOAD_USE_CASE,
  FILE_UPLOAD_USE_CASE_RULES,
  getImageCompressionTargetBytes,
} from '@eridu/api-types/uploads';

import type { PendingUpload } from './json-form.types';

import type { UiSchema } from '@/lib/zod-schema-builder';

export const SCREENSHOT_MAX_BYTES = getImageCompressionTargetBytes(Number.POSITIVE_INFINITY);
export const SCREENSHOT_COMPRESSION_MAX_LONG_EDGES = [1440, 1280, 1080, 960] as const;
const MATERIAL_ASSET_MAX_BYTES = FILE_UPLOAD_USE_CASE_RULES[FILE_UPLOAD_USE_CASE.MATERIAL_ASSET].max_file_size_bytes;
const MATERIAL_ASSET_ALLOWED_MIME_TYPES = new Set(
  FILE_UPLOAD_USE_CASE_RULES[FILE_UPLOAD_USE_CASE.MATERIAL_ASSET].allowed_mime_types,
);

export function isSupportedUploadMimeType(value: string): boolean {
  return MATERIAL_ASSET_ALLOWED_MIME_TYPES.has(value);
}

function isLikelyImageUrl(url: string): boolean {
  return /\.(?:png|jpe?g|webp|gif|bmp|svg)(?:\?.*)?$/i.test(url);
}

export function shouldAttemptImagePreview(item: UiSchema['items'][0], currentUrl: string): boolean {
  if (!currentUrl) {
    return false;
  }
  if (isLikelyImageUrl(currentUrl)) {
    return true;
  }
  return item.validation?.accept?.includes('image/') ?? false;
}

export function releasePendingUploads(map: Record<string, PendingUpload>): void {
  for (const upload of Object.values(map)) {
    if (upload.previewUrl) {
      URL.revokeObjectURL(upload.previewUrl);
    }
  }
}

export function getFieldMaxBytes(item: UiSchema['items'][0], file: File): number {
  const fieldMaxBytes = item.validation?.max_size ?? Number.POSITIVE_INFINITY;
  if (file.type.startsWith('image/')) {
    return getImageCompressionTargetBytes(fieldMaxBytes);
  }
  return fieldMaxBytes;
}

export function getFileTooLargeMessage(label: string, maxBytes: number): string {
  return `File for '${label}' must be <= ${Math.round(maxBytes / 1024)} KB`;
}

export function getFieldMaxHint(item: UiSchema['items'][0], pendingUpload?: PendingUpload): string {
  const fieldMax = item.validation?.max_size ?? MATERIAL_ASSET_MAX_BYTES;
  if (pendingUpload?.file.type.startsWith('image/')) {
    return formatFileSize(getImageCompressionTargetBytes(fieldMax));
  }

  // Image compression is driven by the actual file MIME type (file.type), not the template's
  // accept field. If the field has no accept restriction, image files could be uploaded and would
  // be compressed. Show the image cap hint whenever images are possible for this field.
  const accept = item.validation?.accept;
  const couldReceiveImages = !accept || accept.includes('image/');
  if (couldReceiveImages) {
    return `${formatFileSize(fieldMax)} (images capped at ${formatFileSize(getImageCompressionTargetBytes(fieldMax))})`;
  }
  return formatFileSize(fieldMax);
}

export function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) {
    return 'Unknown size';
  }
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function humanizeExtraKey(key: string): string {
  return key
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .trim()
    .split(/\s+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function stringifyExtraValue(value: unknown): string {
  if (Array.isArray(value)) {
    return value.map((item) => stringifyExtraValue(item)).join('; ');
  }
  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }
  if (isRecord(value)) {
    return JSON.stringify(value);
  }
  return String(value);
}

export function formatExtraItems(value: unknown): string[] {
  if (!isRecord(value)) {
    return [];
  }

  return Object.entries(value)
    .filter(([, item]) => item !== null && item !== undefined && !(typeof item === 'string' && item.trim().length === 0))
    .map(([key, item]) => `${humanizeExtraKey(key)}: ${stringifyExtraValue(item)}`);
}

export function getFileFingerprint(file: File): string {
  return [file.name, file.size, file.type, file.lastModified].join(':');
}
