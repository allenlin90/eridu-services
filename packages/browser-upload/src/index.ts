import {
  buildCompressionDimensions,
  DEFAULT_QUALITIES,
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
};

function replaceFileExtension(fileName: string, mimeType: string): string {
  const extensionByMime: Record<string, string> = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
  };
  const expectedExt = extensionByMime[mimeType];
  if (!expectedExt) {
    return fileName;
  }

  const dotIndex = fileName.lastIndexOf('.');
  if (dotIndex < 0) {
    return `${fileName}${expectedExt}`;
  }

  return `${fileName.slice(0, dotIndex)}${expectedExt}`;
}

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

function pickOutputMimeType(fileType: string, fileName: string, accept?: string): string {
  const currentMime = fileType || 'image/jpeg';
  if (matchesAcceptRule('image/webp', fileName, accept)) {
    return 'image/webp';
  }
  if (matchesAcceptRule('image/jpeg', fileName, accept)) {
    return 'image/jpeg';
  }
  if (matchesAcceptRule(currentMime, fileName, accept)) {
    return currentMime;
  }
  return currentMime;
}

async function canvasToBlob(canvas: HTMLCanvasElement, mimeType: string, quality?: number): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), mimeType, quality);
  });
}

async function compressInMainThread(file: File, options: PrepareImageForUploadOptions): Promise<Blob> {
  const outputMimeType = pickOutputMimeType(file.type, file.name, options.accept);
  const image = await createImageBitmap(file);
  let bestBlob: Blob | null = null;

  try {
    const compressionDimensions = buildCompressionDimensions(image.width, image.height, options);

    for (const dimensions of compressionDimensions) {
      const canvas = document.createElement('canvas');
      canvas.width = dimensions.width;
      canvas.height = dimensions.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        continue;
      }

      ctx.drawImage(image, 0, 0, dimensions.width, dimensions.height);

      for (const quality of DEFAULT_QUALITIES) {
        const blob = await canvasToBlob(canvas, outputMimeType, quality);
        if (!blob) {
          continue;
        }
        if (!bestBlob || blob.size < bestBlob.size) {
          bestBlob = blob;
        }
        if (blob.size <= options.targetMaxBytes) {
          return blob;
        }
      }
    }
  } finally {
    image.close();
  }

  return bestBlob ?? file;
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
    return { file, wasCompressed: false, usedWorker: false };
  }
  if (file.size <= options.targetMaxBytes) {
    return { file, wasCompressed: false, usedWorker: false };
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
  };
}
