import { ExternalLink, ImageOff } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@eridu/ui';

type SceneQcImageFrameProps = {
  src: string;
  alt: string;
  className?: string;
};

/**
 * Single-image display with `onError` -> retry/open-original controls.
 * NEVER auto-selects Fail on a load failure -- that stays an explicit
 * operator action (§7.3 row 3, §12.3). Shared by the Live evidence side and
 * the Expected reference side.
 *
 * Callers must render with `key={src}` (the standard React "reset state via
 * key" pattern) so a NEW `src` remounts a fresh, non-failed instance instead
 * of needing a `useEffect` to reset `failed`.
 */
export function SceneQcImageFrame({ src, alt, className }: SceneQcImageFrameProps) {
  const [failed, setFailed] = useState(false);
  const [retryKey, setRetryKey] = useState(0);

  if (failed) {
    return (
      <div className={`flex min-h-[16rem] flex-col items-center justify-center gap-3 rounded-lg border bg-slate-950 px-6 text-center text-slate-300 ${className ?? ''}`}>
        <ImageOff className="h-8 w-8" />
        <p className="text-sm">Could not load this image.</p>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => {
              setFailed(false);
              setRetryKey((key) => key + 1);
            }}
          >
            Retry
          </Button>
          <Button variant="secondary" size="sm" asChild>
            <a href={src} target="_blank" rel="noreferrer">
              Open original
              <ExternalLink className="ml-2 h-3.5 w-3.5" />
            </a>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex min-h-[16rem] items-center justify-center overflow-hidden rounded-lg border bg-slate-950 ${className ?? ''}`}>
      <img
        key={retryKey}
        src={src}
        alt={alt}
        className="max-h-[60vh] max-w-full object-contain"
        onError={() => setFailed(true)}
      />
    </div>
  );
}
