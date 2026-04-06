import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { prepareImageForUpload } from './index';

const TARGET_MAX_BYTES = 200 * 1024;

type MockCanvas = HTMLCanvasElement & {
  width: number;
  height: number;
};

function installCanvasMock(sizeFactor: number) {
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
      })),
      toBlob(callback: BlobCallback, type?: string, quality?: number) {
        const encodedSize = Math.max(8_192, Math.round(this.width * this.height * (quality ?? 1) * sizeFactor));
        callback(new Blob([new Uint8Array(encodedSize)], { type: type ?? 'image/jpeg' }));
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

    const canvasSpy = installCanvasMock(0.6);
    const urlMocks = installImageMock();
    const file = new File([new Uint8Array(500_000)], 'iphone-photo.jpg', { type: 'image/jpeg' });

    const prepared = await prepareImageForUpload(file, {
      targetMaxBytes: TARGET_MAX_BYTES,
      maxLongEdges: [1440, 1280, 1080, 960],
      preferWorker: true,
    });

    expect(prepared.usedWorker).toBe(false);
    expect(prepared.wasCompressed).toBe(true);
    expect(prepared.file.size).toBeLessThanOrEqual(TARGET_MAX_BYTES);
    expect(prepared.file.type).toBe('image/webp');
    expect(urlMocks.createObjectURL).toHaveBeenCalledTimes(1);
    expect(urlMocks.revokeObjectURL).toHaveBeenCalledTimes(1);
    expect(canvasSpy).toHaveBeenCalledWith('canvas');
  });

  it('falls back to HTMLImageElement decoding when createImageBitmap exists but rejects the file', async () => {
    Object.defineProperty(globalThis, 'createImageBitmap', {
      configurable: true,
      value: vi.fn().mockRejectedValue(new Error('Blob decoding failed')),
    });

    installCanvasMock(0.6);
    const urlMocks = installImageMock();
    const file = new File([new Uint8Array(450_000)], 'iphone-screenshot.png', { type: 'image/png' });

    const prepared = await prepareImageForUpload(file, {
      targetMaxBytes: TARGET_MAX_BYTES,
      maxLongEdges: [1440, 1280, 1080, 960],
      preferWorker: false,
    });

    expect(prepared.usedWorker).toBe(false);
    expect(prepared.wasCompressed).toBe(true);
    expect(prepared.file.size).toBeLessThanOrEqual(TARGET_MAX_BYTES);
    expect(prepared.file.type).toBe('image/webp');
    expect(prepared.file.name).toBe('iphone-screenshot.webp');
    expect(urlMocks.createObjectURL).toHaveBeenCalledTimes(1);
    expect(urlMocks.revokeObjectURL).toHaveBeenCalledTimes(1);
  });

  it('prefers webp when accept rules are extension-based and allow webp output', async () => {
    Object.defineProperty(globalThis, 'createImageBitmap', {
      configurable: true,
      value: vi.fn().mockRejectedValue(new Error('Blob decoding failed')),
    });

    installCanvasMock(0.6);
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
  });
});
