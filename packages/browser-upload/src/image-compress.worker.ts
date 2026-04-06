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
  if (!matchesAccept(candidateMimeType, replaceFileExtension(fileName, candidateMimeType), accept)) {
    return;
  }

  seenMimeTypes.add(candidateMimeType);
  candidates.push(candidateMimeType);
}

async function supportsWebpEncoding(): Promise<boolean> {
  if (typeof OffscreenCanvas === 'undefined') {
    return false;
  }

  try {
    const canvas = new OffscreenCanvas(1, 1);
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return false;
    }

    ctx.fillRect(0, 0, 1, 1);
    const blob = await canvas.convertToBlob({ type: 'image/webp', quality: 0.8 });
    return blob.type === 'image/webp';
  } catch {
    return false;
  }
}

async function listOutputMimeTypes(fileType: string, fileName: string, accept?: string): Promise<string[]> {
  const currentMime = fileType || 'image/jpeg';
  const candidates: string[] = [];
  const seenMimeTypes = new Set<string>();
  const webpAllowed = matchesAccept('image/webp', replaceFileExtension(fileName, 'image/webp'), accept);
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

async function compressImage(input: WorkerInput): Promise<Blob> {
  if (typeof createImageBitmap !== 'function' || typeof OffscreenCanvas === 'undefined') {
    throw new TypeError('Offscreen compression is not supported');
  }

  const inputBlob = new Blob([input.fileArrayBuffer], { type: input.fileType });
  if (inputBlob.size <= input.targetMaxBytes) {
    return inputBlob;
  }

  const outputMimeTypes = await listOutputMimeTypes(input.fileType, input.fileName, input.accept);
  const image = await createImageBitmap(inputBlob);
  let bestBlob: Blob = inputBlob;

  try {
    const compressionDimensions = buildCompressionDimensions(image.width, image.height, input);

    for (const outputMimeType of outputMimeTypes) {
      for (const dimensions of compressionDimensions) {
        const canvas = new OffscreenCanvas(dimensions.width, dimensions.height);
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          continue;
        }
        ctx.drawImage(image, 0, 0, dimensions.width, dimensions.height);

        for (const quality of DEFAULT_QUALITIES) {
          const blob = await canvas.convertToBlob({ type: outputMimeType, quality });
          if (blob.type !== outputMimeType) {
            continue;
          }
          if (blob.size < bestBlob.size) {
            bestBlob = blob;
          }
          if (blob.size <= input.targetMaxBytes) {
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
