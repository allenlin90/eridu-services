type WorkerInput = {
  fileArrayBuffer: ArrayBuffer;
  fileName: string;
  fileType: string;
  accept?: string;
  targetMaxBytes: number;
  maxDimension?: number;
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

const DEFAULT_SCALES = [1, 0.9, 0.8, 0.7, 0.6, 0.5, 0.4, 0.3, 0.25];
const DEFAULT_QUALITIES = [0.9, 0.82, 0.74, 0.66, 0.58, 0.5, 0.42, 0.34, 0.26, 0.2];

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
  if (matchesAccept('image/webp', fileName, accept)) {
    return 'image/webp';
  }
  if (matchesAccept('image/jpeg', fileName, accept)) {
    return 'image/jpeg';
  }
  if (matchesAccept(currentMime, fileName, accept)) {
    return currentMime;
  }

  return currentMime;
}

function scaledDimensions(width: number, height: number, scale: number, maxDimension?: number): { width: number; height: number } {
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
    for (const scale of DEFAULT_SCALES) {
      const dimensions = scaledDimensions(
        image.width,
        image.height,
        scale,
        input.maxDimension,
      );

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
