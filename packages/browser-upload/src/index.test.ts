import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { prepareImageForUpload } from './index';

const TARGET_MAX_BYTES = 200 * 1024;

type MockCanvas = HTMLCanvasElement & {
  width: number;
  height: number;
};

type CanvasPlan = number | {
  default?: {
    sizeFactor: number;
    blobType?: string;
  };
  [mimeType: string]: {
    sizeFactor: number;
    blobType?: string;
  } | undefined;
};

function installCanvasMock(plan: CanvasPlan) {
  const originalCreateElement = document.createElement.bind(document);

  return vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
    if (tagName !== 'canvas') {
      return originalCreateElement(tagName);
    }

    const canvas = {
      width: 0,
      height: 0,
      getContext: vi.fn(() => ({
        drawImage: vi.fn(),
        fillRect: vi.fn(),
      })),
      toBlob(callback: BlobCallback, type?: string, quality?: number) {
        const requestedType = type ?? 'image/jpeg';
        const mimePlan = typeof plan === 'number'
          ? { sizeFactor: plan, blobType: requestedType }
          : (plan[requestedType] ?? plan.default ?? { sizeFactor: 1, blobType: requestedType });
        const encodedSize = Math.max(
          8_192,
          Math.round(this.width * this.height * (quality ?? 1) * mimePlan.sizeFactor),
        );
        callback(new Blob([new Uint8Array(encodedSize)], { type: mimePlan.blobType ?? requestedType }));
      },
    } as unknown as MockCanvas;

    return canvas;
  });
}

function installImageMock() {
  const createObjectURL = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-image');
  const revokeObjectURL = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

  class MockImage {
    onload: null | (() => void) = null;
    onerror: null | (() => void) = null;
    naturalWidth = 1179;
    naturalHeight = 2556;
    width = 1179;
    height = 2556;
    #src = '';

    set src(_value: string) {
      this.#src = _value;
      queueMicrotask(() => {
        this.onload?.();
      });
    }

    get src() {
      return this.#src;
    }
  }

  Object.defineProperty(globalThis, 'Image', {
    configurable: true,
    value: MockImage,
  });

  return { createObjectURL, revokeObjectURL };
}

function installWorkerMock(outputSizeBytes: number, outputMimeType = 'image/webp') {
  Object.defineProperty(globalThis, 'Worker', {
    configurable: true,
    value: class MockWorker {
      onmessage: ((event: MessageEvent) => void) | null = null;
      onerror: (() => void) | null = null;

      postMessage() {
        const responseBuffer = new Uint8Array(outputSizeBytes).buffer;
        queueMicrotask(() => {
          this.onmessage?.({
            data: { ok: true, fileArrayBuffer: responseBuffer, fileType: outputMimeType },
          } as MessageEvent);
        });
      }

      terminate() {}
    },
  });
}

describe('prepareImageForUpload', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('compresses via worker on the happy path', async () => {
    installWorkerMock(50_000, 'image/webp');

    const file = new File([new Uint8Array(500_000)], 'photo.jpg', { type: 'image/jpeg' });

    const prepared = await prepareImageForUpload(file, {
      targetMaxBytes: TARGET_MAX_BYTES,
      preferWorker: true,
    });

    expect(prepared.usedWorker).toBe(true);
    expect(prepared.wasCompressed).toBe(true);
    expect(prepared.metTarget).toBe(true);
    expect(prepared.file.size).toBeLessThanOrEqual(TARGET_MAX_BYTES);
    expect(prepared.file.type).toBe('image/webp');
    expect(prepared.file.name).toBe('photo.webp');
  });

  it('falls back to HTMLImageElement decoding when worker creation fails on iPhone-like browsers', async () => {
    Object.defineProperty(globalThis, 'Worker', {
      configurable: true,
      value: class {
        constructor() {
          throw new Error('Module workers are unsupported');
        }
      },
    });
    Object.defineProperty(globalThis, 'createImageBitmap', {
      configurable: true,
      value: undefined,
    });

    const canvasSpy = installCanvasMock({
      'image/jpeg': { sizeFactor: 0.6, blobType: 'image/jpeg' },
      'image/webp': { sizeFactor: 0.5, blobType: 'image/webp' },
      'default': { sizeFactor: 1.6 },
    });
    const urlMocks = installImageMock();
    const file = new File([new Uint8Array(500_000)], 'iphone-photo.jpg', { type: 'image/jpeg' });

    const prepared = await prepareImageForUpload(file, {
      targetMaxBytes: TARGET_MAX_BYTES,
      maxLongEdges: [1440, 1280, 1080, 960],
      preferWorker: true,
    });

    expect(prepared.usedWorker).toBe(false);
    expect(prepared.wasCompressed).toBe(true);
    expect(prepared.metTarget).toBe(true);
    expect(prepared.file.size).toBeLessThanOrEqual(TARGET_MAX_BYTES);
    expect(prepared.file.type).toBe('image/jpeg');
    expect(urlMocks.createObjectURL).toHaveBeenCalledTimes(1);
    expect(urlMocks.revokeObjectURL).toHaveBeenCalledTimes(1);
    expect(canvasSpy).toHaveBeenCalledWith('canvas');
  });

  it('falls back to HTMLImageElement decoding when createImageBitmap exists but rejects the file', async () => {
    Object.defineProperty(globalThis, 'createImageBitmap', {
      configurable: true,
      value: vi.fn().mockRejectedValue(new Error('Blob decoding failed')),
    });

    installCanvasMock({
      'image/jpeg': { sizeFactor: 0.16, blobType: 'image/jpeg' },
      'image/webp': { sizeFactor: 0.5, blobType: 'image/webp' },
      'default': { sizeFactor: 1.6 },
    });
    const urlMocks = installImageMock();
    const file = new File([new Uint8Array(450_000)], 'iphone-screenshot.png', { type: 'image/png' });

    const prepared = await prepareImageForUpload(file, {
      targetMaxBytes: TARGET_MAX_BYTES,
      maxLongEdges: [1440, 1280, 1080, 960],
      preferWorker: false,
    });

    expect(prepared.usedWorker).toBe(false);
    expect(prepared.wasCompressed).toBe(true);
    expect(prepared.metTarget).toBe(true);
    expect(prepared.file.size).toBeLessThanOrEqual(TARGET_MAX_BYTES);
    expect(prepared.file.type).toBe('image/jpeg');
    expect(prepared.file.name).toBe('iphone-screenshot.jpg');
    expect(urlMocks.createObjectURL).toHaveBeenCalledTimes(1);
    expect(urlMocks.revokeObjectURL).toHaveBeenCalledTimes(1);
  });

  it('still uses webp when extension-based accepts allow it and jpeg cannot meet the target', async () => {
    Object.defineProperty(globalThis, 'createImageBitmap', {
      configurable: true,
      value: vi.fn().mockRejectedValue(new Error('Blob decoding failed')),
    });

    // JPEG sizeFactor must exceed ~9.07 so JPEG blobs remain over the target even
    // at the smallest scale step (0.25 × 1179×2556 → 295×639 at quality 0.12).
    installCanvasMock({
      'image/jpeg': { sizeFactor: 12.0, blobType: 'image/jpeg' },
      'image/webp': { sizeFactor: 2.5, blobType: 'image/webp' },
      'default': { sizeFactor: 12.0 },
    });
    installImageMock();
    const file = new File([new Uint8Array(450_000)], 'show-reference.png', { type: 'image/png' });

    const prepared = await prepareImageForUpload(file, {
      targetMaxBytes: TARGET_MAX_BYTES,
      accept: '.png,.jpg,.jpeg,.webp',
      maxLongEdges: [1440, 1280, 1080, 960],
      preferWorker: false,
    });

    expect(prepared.file.type).toBe('image/webp');
    expect(prepared.file.name).toBe('show-reference.webp');
    expect(prepared.file.size).toBeLessThanOrEqual(TARGET_MAX_BYTES);
    expect(prepared.metTarget).toBe(true);
  });

  it('tries safer MIME candidates before webp on iPhone-like fallback paths', async () => {
    Object.defineProperty(globalThis, 'createImageBitmap', {
      configurable: true,
      value: vi.fn().mockRejectedValue(new Error('Blob decoding failed')),
    });

    installCanvasMock({
      'image/jpeg': { sizeFactor: 0.16, blobType: 'image/jpeg' },
      'image/webp': { sizeFactor: 0.52, blobType: 'image/webp' },
      'image/png': { sizeFactor: 1.8, blobType: 'image/png' },
    });
    installImageMock();
    const file = new File([new Uint8Array(900_000)], 'iphone-screenshot.png', { type: 'image/png' });

    const prepared = await prepareImageForUpload(file, {
      targetMaxBytes: TARGET_MAX_BYTES,
      accept: '.png,.jpg,.jpeg,.webp',
      maxLongEdges: [1440, 1280, 1080, 960],
      preferWorker: false,
    });

    expect(prepared.file.type).toBe('image/jpeg');
    expect(prepared.file.name).toBe('iphone-screenshot.jpg');
    expect(prepared.file.size).toBeLessThanOrEqual(TARGET_MAX_BYTES);
    expect(prepared.metTarget).toBe(true);
  });

  it('skips webp output when the browser cannot really encode webp', async () => {
    Object.defineProperty(globalThis, 'createImageBitmap', {
      configurable: true,
      value: vi.fn().mockRejectedValue(new Error('Blob decoding failed')),
    });

    installCanvasMock({
      'image/jpeg': { sizeFactor: 0.18, blobType: 'image/jpeg' },
      'image/webp': { sizeFactor: 0.12, blobType: 'image/png' },
      'default': { sizeFactor: 1.2 },
    });
    installImageMock();
    const file = new File([new Uint8Array(600_000)], 'photo.png', { type: 'image/png' });

    const prepared = await prepareImageForUpload(file, {
      targetMaxBytes: TARGET_MAX_BYTES,
      accept: '.png,.jpg,.jpeg,.webp',
      maxLongEdges: [1440, 1280, 1080, 960],
      preferWorker: false,
    });

    expect(prepared.file.type).toBe('image/jpeg');
    expect(prepared.file.name).toBe('photo.jpg');
    expect(prepared.metTarget).toBe(true);
  });

  it('reports when best-effort compression still exceeds the target', async () => {
    Object.defineProperty(globalThis, 'createImageBitmap', {
      configurable: true,
      value: vi.fn().mockRejectedValue(new Error('Blob decoding failed')),
    });

    // All sizeFactors must exceed ~9.07 so every MIME type stays over the target
    // even at the smallest scale step (0.25 × 1179×2556 → 295×639 at quality 0.12).
    installCanvasMock({
      'image/jpeg': { sizeFactor: 12.0, blobType: 'image/jpeg' },
      'image/webp': { sizeFactor: 12.0, blobType: 'image/webp' },
      'default': { sizeFactor: 12.0 },
    });
    installImageMock();
    const file = new File([new Uint8Array(900_000)], 'oversize.png', { type: 'image/png' });

    const prepared = await prepareImageForUpload(file, {
      targetMaxBytes: TARGET_MAX_BYTES,
      accept: '.png,.jpg,.jpeg,.webp',
      maxLongEdges: [1440, 1280, 1080, 960],
      preferWorker: false,
    });

    expect(prepared.file.size).toBeGreaterThan(TARGET_MAX_BYTES);
    expect(prepared.file.size).toBeLessThan(file.size);
    expect(prepared.metTarget).toBe(false);
  });
});
