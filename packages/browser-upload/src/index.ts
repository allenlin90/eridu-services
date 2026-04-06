import {
  buildCompressionDimensions,
  DEFAULT_QUALITIES,
  replaceFileExtension,
} from './compress-utils';

type CompressionWorkerResult =
  | { ok: true; fileArrayBuffer: ArrayBuffer; fileType: string }
  | { ok: false; message: string };

export type PrepareImageForUploadOptions = {
  targetMaxBytes: number;
  accept?: string;
  /**
   * Optional scalar clamp applied to the generic scale-based search.
   * Ignored when `maxLongEdges` is provided — `maxLongEdges` always takes precedence.
   */
  maxDimension?: number;
  /**
   * Explicit long-edge ladder (e.g. `[1440, 1280, 1080, 960]`) used instead of
   * the generic scale search. When set, `maxDimension` is ignored.
   * Prefer this for screenshot-sized uploads where a single clamp would collapse
   * multiple scale steps into the same output size.
   */
  maxLongEdges?: readonly number[];
  preferWorker?: boolean;
};

export type PreparedImageResult = {
  file: File;
  wasCompressed: boolean;
  usedWorker: boolean;
  metTarget: boolean;
};

export function matchesAcceptRule(fileType: string, fileName: string, accept?: string): boolean {
  if (!accept || accept.trim().length === 0) {
    return true;
  }

  const patterns = accept
    .split(',')
    .map((part) => part.trim().toLowerCase())
    .filter(Boolean);

  if (patterns.length === 0) {
    return true;
  }

  const normalizedMime = (fileType.toLowerCase().split(';')[0] ?? fileType.toLowerCase()).trim();
  const lowerName = fileName.toLowerCase();

  return patterns.some((pattern) => {
    if (pattern.endsWith('/*')) {
      return normalizedMime.startsWith(pattern.slice(0, -1));
    }
    if (pattern.startsWith('.')) {
      return lowerName.endsWith(pattern);
    }
    return normalizedMime === pattern;
  });
}

function addOutputMimeCandidate(
  candidates: string[],
  seenMimeTypes: Set<string>,
  candidateMimeType: string,
  fileName: string,
  accept?: string,
): void {
  if (seenMimeTypes.has(candidateMimeType)) {
    return;
  }
  if (!matchesAcceptRule(candidateMimeType, replaceFileExtension(fileName, candidateMimeType), accept)) {
    return;
  }

  seenMimeTypes.add(candidateMimeType);
  candidates.push(candidateMimeType);
}

async function supportsCanvasEncoding(mimeType: string): Promise<boolean> {
  if (typeof document === 'undefined') {
    return false;
  }

  const canvas = document.createElement('canvas');
  canvas.width = 1;
  canvas.height = 1;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return false;
  }

  ctx.fillRect(0, 0, 1, 1);
  const blob = await canvasToBlob(canvas, mimeType, 0.8);
  return blob?.type === mimeType;
}

async function supportsWebpEncoding(): Promise<boolean> {
  return supportsCanvasEncoding('image/webp');
}

async function listOutputMimeTypes(fileType: string, fileName: string, accept?: string): Promise<string[]> {
  const currentMime = fileType || 'image/jpeg';
  const candidates: string[] = [];
  const seenMimeTypes = new Set<string>();
  const webpAllowed = matchesAcceptRule('image/webp', replaceFileExtension(fileName, 'image/webp'), accept);
  const webpSupported = webpAllowed ? await supportsWebpEncoding() : false;

  const addCandidate = (candidateMimeType: string) => {
    addOutputMimeCandidate(candidates, seenMimeTypes, candidateMimeType, fileName, accept);
  };

  if (currentMime === 'image/png') {
    addCandidate('image/jpeg');
    if (webpSupported) {
      addCandidate('image/webp');
    }
    addCandidate(currentMime);
  } else {
    addCandidate(currentMime);
    if (currentMime !== 'image/jpeg') {
      addCandidate('image/jpeg');
    }
    if (currentMime !== 'image/webp' && webpSupported) {
      addCandidate('image/webp');
    }
  }

  if (candidates.length === 0) {
    candidates.push(currentMime);
  }

  return candidates;
}

async function canvasToBlob(canvas: HTMLCanvasElement, mimeType: string, quality?: number): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), mimeType, quality);
  });
}

type DecodedMainThreadImage = {
  source: CanvasImageSource;
  width: number;
  height: number;
  close: () => void;
};

async function decodeImageInMainThread(file: Blob): Promise<DecodedMainThreadImage> {
  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(file);
      return {
        source: bitmap,
        width: bitmap.width,
        height: bitmap.height,
        close: () => bitmap.close(),
      };
    } catch {
      // Some Safari/iPhone variants expose createImageBitmap but still fail File/Blob decoding.
    }
  }

  if (
    typeof Image === 'undefined'
    || typeof URL === 'undefined'
    || typeof URL.createObjectURL !== 'function'
    || typeof URL.revokeObjectURL !== 'function'
  ) {
    throw new TypeError('Main-thread image decoding is not supported');
  }

  const objectUrl = URL.createObjectURL(file);

  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const nextImage = new Image();
      nextImage.onload = () => resolve(nextImage);
      nextImage.onerror = () => reject(new Error('Failed to decode image'));
      nextImage.src = objectUrl;
    });

    const width = image.naturalWidth || image.width;
    const height = image.naturalHeight || image.height;
    if (width <= 0 || height <= 0) {
      throw new Error('Decoded image has invalid dimensions');
    }

    return {
      source: image,
      width,
      height,
      close: () => URL.revokeObjectURL(objectUrl),
    };
  } catch (error) {
    URL.revokeObjectURL(objectUrl);
    throw error;
  }
}

async function compressInMainThread(file: File, options: PrepareImageForUploadOptions): Promise<Blob> {
  const outputMimeTypes = await listOutputMimeTypes(file.type, file.name, options.accept);
  const image = await decodeImageInMainThread(file);
  let bestBlob: Blob = file;

  try {
    const compressionDimensions = buildCompressionDimensions(image.width, image.height, options);

    for (const outputMimeType of outputMimeTypes) {
      for (const dimensions of compressionDimensions) {
        const canvas = document.createElement('canvas');
        canvas.width = dimensions.width;
        canvas.height = dimensions.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          continue;
        }

        ctx.drawImage(image.source, 0, 0, dimensions.width, dimensions.height);

        for (const quality of DEFAULT_QUALITIES) {
          const blob = await canvasToBlob(canvas, outputMimeType, quality);
          if (!blob || blob.type !== outputMimeType) {
            continue;
          }
          if (blob.size < bestBlob.size) {
            bestBlob = blob;
          }
          if (blob.size <= options.targetMaxBytes) {
            return blob;
          }
        }
      }
    }
  } finally {
    image.close();
  }

  return bestBlob;
}

function supportsWorkerCompression(): boolean {
  return typeof Worker !== 'undefined' && typeof URL !== 'undefined';
}

async function compressInWorker(file: File, options: PrepareImageForUploadOptions): Promise<Blob> {
  const worker = new Worker(new URL('./image-compress.worker.ts', import.meta.url), { type: 'module' });

  try {
    const fileArrayBuffer = await file.arrayBuffer();

    const result = await new Promise<CompressionWorkerResult>((resolve, reject) => {
      worker.onmessage = (event: MessageEvent<CompressionWorkerResult>) => {
        resolve(event.data);
      };
      worker.onerror = () => {
        reject(new Error('Compression worker crashed'));
      };

      worker.postMessage({
        fileArrayBuffer,
        fileName: file.name,
        fileType: file.type,
        accept: options.accept,
        targetMaxBytes: options.targetMaxBytes,
        maxDimension: options.maxDimension,
        maxLongEdges: options.maxLongEdges,
      }, [fileArrayBuffer]);
    });

    if (!result.ok) {
      throw new Error(result.message);
    }

    return new Blob([result.fileArrayBuffer], { type: result.fileType || file.type });
  } finally {
    worker.terminate();
  }
}

export async function prepareImageForUpload(file: File, options: PrepareImageForUploadOptions): Promise<PreparedImageResult> {
  if (!file.type.startsWith('image/')) {
    return { file, wasCompressed: false, usedWorker: false, metTarget: true };
  }
  if (file.size <= options.targetMaxBytes) {
    return { file, wasCompressed: false, usedWorker: false, metTarget: true };
  }

  const preferWorker = options.preferWorker ?? true;
  let compressedBlob: Blob | null = null;
  let usedWorker = false;

  if (preferWorker && supportsWorkerCompression()) {
    try {
      compressedBlob = await compressInWorker(file, options);
      usedWorker = true;
    } catch {
      compressedBlob = null;
    }
  }

  if (!compressedBlob) {
    compressedBlob = await compressInMainThread(file, options);
    usedWorker = false;
  }

  const nextType = compressedBlob.type || file.type;
  const nextName = replaceFileExtension(file.name, nextType);
  const nextFile = new File([compressedBlob], nextName, {
    type: nextType,
    lastModified: Date.now(),
  });

  return {
    file: nextFile,
    wasCompressed: nextFile.size < file.size || nextFile.type !== file.type || nextFile.name !== file.name,
    usedWorker,
    metTarget: nextFile.size <= options.targetMaxBytes,
  };
}
