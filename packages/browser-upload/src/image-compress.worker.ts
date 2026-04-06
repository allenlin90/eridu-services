import {
  buildCompressionDimensions,
  DEFAULT_QUALITIES,
  replaceFileExtension,
} from './compress-utils';

type WorkerInput = {
  fileArrayBuffer: ArrayBuffer;
  fileName: string;
  fileType: string;
  accept?: string;
  targetMaxBytes: number;
  maxDimension?: number;
  maxLongEdges?: readonly number[];
};

type WorkerOutput = {
  ok: true;
  fileArrayBuffer: ArrayBuffer;
  fileType: string;
};

type WorkerError = {
  ok: false;
  message: string;
};

const workerScope: DedicatedWorkerGlobalScope = globalThis as unknown as DedicatedWorkerGlobalScope;

function matchesAccept(fileType: string, fileName: string, accept?: string): boolean {
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
  if (matchesAccept('image/webp', replaceFileExtension(fileName, 'image/webp'), accept)) {
    return 'image/webp';
  }
  if (matchesAccept('image/jpeg', replaceFileExtension(fileName, 'image/jpeg'), accept)) {
    return 'image/jpeg';
  }
  if (matchesAccept(currentMime, replaceFileExtension(fileName, currentMime), accept)) {
    return currentMime;
  }

  return currentMime;
}

async function compressImage(input: WorkerInput): Promise<Blob> {
  if (typeof createImageBitmap !== 'function' || typeof OffscreenCanvas === 'undefined') {
    throw new TypeError('Offscreen compression is not supported');
  }

  const inputBlob = new Blob([input.fileArrayBuffer], { type: input.fileType });
  if (inputBlob.size <= input.targetMaxBytes) {
    return inputBlob;
  }

  const outputMimeType = pickOutputMimeType(input.fileType, input.fileName, input.accept);
  const image = await createImageBitmap(inputBlob);
  let bestBlob: Blob | null = null;

  try {
    const compressionDimensions = buildCompressionDimensions(image.width, image.height, input);

    for (const dimensions of compressionDimensions) {
      const canvas = new OffscreenCanvas(dimensions.width, dimensions.height);
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        continue;
      }
      ctx.drawImage(image, 0, 0, dimensions.width, dimensions.height);

      for (const quality of DEFAULT_QUALITIES) {
        const blob = await canvas.convertToBlob({ type: outputMimeType, quality });
        if (!bestBlob || blob.size < bestBlob.size) {
          bestBlob = blob;
        }
        if (blob.size <= input.targetMaxBytes) {
          return blob;
        }
      }
    }
  } finally {
    image.close();
  }

  return bestBlob ?? inputBlob;
}

workerScope.onmessage = async (event: MessageEvent<WorkerInput>) => {
  try {
    const compressedBlob = await compressImage(event.data);
    const fileArrayBuffer = await compressedBlob.arrayBuffer();
    const output: WorkerOutput = {
      ok: true,
      fileArrayBuffer,
      fileType: compressedBlob.type || event.data.fileType,
    };
    workerScope.postMessage(output, [fileArrayBuffer]);
  } catch (error) {
    const output: WorkerError = {
      ok: false,
      message: error instanceof Error ? error.message : 'Unknown compression worker error',
    };
    workerScope.postMessage(output);
  }
};
