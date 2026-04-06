export const DEFAULT_SCALES = [1, 0.9, 0.8, 0.7, 0.6, 0.5, 0.4, 0.3, 0.25];

const EXTENSION_BY_MIME: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

export function replaceFileExtension(fileName: string, mimeType: string): string {
  const expectedExt = EXTENSION_BY_MIME[mimeType];
  if (!expectedExt) {
    return fileName;
  }

  const dotIndex = fileName.lastIndexOf('.');
  if (dotIndex < 0) {
    return `${fileName}${expectedExt}`;
  }

  return `${fileName.slice(0, dotIndex)}${expectedExt}`;
}

// Quality ladder for compression attempts. Values below 0.2 (0.16, 0.12) are
// last-resort steps that only activate when all dimension steps + higher quality
// levels still fail to reach the target size. They will produce visible artifacts.
export const DEFAULT_QUALITIES = [0.9, 0.82, 0.74, 0.66, 0.58, 0.5, 0.42, 0.34, 0.26, 0.2, 0.16, 0.12];

export type CompressionDimensionOptions = {
  /**
   * Long-edge ladder to use instead of scale-based search. When provided,
   * `maxDimension` is ignored — `maxLongEdges` always takes precedence.
   */
  maxLongEdges?: readonly number[];
  maxDimension?: number;
};

export function clampToMaxDimension(
  width: number,
  height: number,
  maxDimension?: number,
): { width: number; height: number } {
  if (!maxDimension || maxDimension <= 0) {
    return { width, height };
  }

  const longest = Math.max(width, height);
  if (longest <= maxDimension) {
    return { width, height };
  }

  const ratio = maxDimension / longest;
  return {
    width: Math.max(1, Math.round(width * ratio)),
    height: Math.max(1, Math.round(height * ratio)),
  };
}

export function scaledDimensions(
  width: number,
  height: number,
  scale: number,
  maxDimension?: number,
): { width: number; height: number } {
  return clampToMaxDimension(
    Math.max(1, Math.round(width * scale)),
    Math.max(1, Math.round(height * scale)),
    maxDimension,
  );
}

export function longEdgeDimensions(
  width: number,
  height: number,
  maxLongEdge: number,
): { width: number; height: number } {
  if (!Number.isFinite(maxLongEdge) || maxLongEdge <= 0) {
    return { width, height };
  }

  return clampToMaxDimension(width, height, maxLongEdge);
}

export function buildCompressionDimensions(
  width: number,
  height: number,
  options: CompressionDimensionOptions,
): Array<{ width: number; height: number }> {
  const dimensions = new Map<string, { width: number; height: number }>();

  const addDimensions = (next: { width: number; height: number }) => {
    dimensions.set(`${next.width}x${next.height}`, next);
  };

  if (options.maxLongEdges && options.maxLongEdges.length > 0) {
    for (const maxLongEdge of options.maxLongEdges) {
      addDimensions(longEdgeDimensions(width, height, maxLongEdge));
    }

    return [...dimensions.values()];
  }

  for (const scale of DEFAULT_SCALES) {
    addDimensions(scaledDimensions(width, height, scale, options.maxDimension));
  }

  return [...dimensions.values()];
}
