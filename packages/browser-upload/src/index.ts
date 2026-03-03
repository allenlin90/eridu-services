type CompressionWorkerResult =
  | { ok: true; fileArrayBuffer: ArrayBuffer; fileType: string }
  | { ok: false; message: string };

export type PrepareImageForUploadOptions = {
  targetMaxBytes: number;
  accept?: string;
  maxDimension?: number;
  preferWorker?: boolean;
};

export type PreparedImageResult = {
  file: File;
  wasCompressed: boolean;
  usedWorker: boolean;
};

const DEFAULT_SCALES = [1, 0.9, 0.8, 0.7, 0.6];
const DEFAULT_QUALITIES = [0.9, 0.82, 0.74, 0.66, 0.58, 0.5, 0.42, 0.34];

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
  if (matchesAcceptRule(currentMime, fileName, accept)) {
    return currentMime;
  }
  if (matchesAcceptRule('image/jpeg', fileName, accept)) {
    return 'image/jpeg';
  }
  if (matchesAcceptRule('image/webp', fileName, accept)) {
    return 'image/webp';
  }
  return currentMime;
}

function calculateDimensions(width: number, height: number, scale: number, maxDimension?: number): { width: number; height: number } {
  let nextWidth = Math.max(1, Math.round(width * scale));
  let nextHeight = Math.max(1, Math.round(height * scale));

  if (!maxDimension || maxDimension <= 0) {
    return { width: nextWidth, height: nextHeight };
  }

  const longest = Math.max(nextWidth, nextHeight);
  if (longest <= maxDimension) {
    return { width: nextWidth, height: nextHeight };
  }

  const ratio = maxDimension / longest;
  nextWidth = Math.max(1, Math.round(nextWidth * ratio));
  nextHeight = Math.max(1, Math.round(nextHeight * ratio));
  return { width: nextWidth, height: nextHeight };
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
    for (const scale of DEFAULT_SCALES) {
      const dimensions = calculateDimensions(
        image.width,
        image.height,
        scale,
        options.maxDimension,
      );

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
      }, [fileArrayBuffer]);
    });

    if ('message' in result) {
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
