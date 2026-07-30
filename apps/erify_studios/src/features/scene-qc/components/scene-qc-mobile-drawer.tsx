import { useState } from 'react';

import type { SceneQcDailyItemDetail } from '@eridu/api-types/scene-qc';
import {
  Button,
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  Skeleton,
} from '@eridu/ui';

import type { useSceneQcReviewForm } from '../hooks/use-scene-qc-review-form';

import { SceneQcBlockedPanel } from './scene-qc-blocked-panel';
import { SceneQcEvidenceSelector } from './scene-qc-evidence-selector';
import { SceneQcExpectedReferencePanel } from './scene-qc-expected-reference-panel';
import { SceneQcImageFrame } from './scene-qc-image-frame';
import { SceneQcResultForm } from './scene-qc-result-form';

type SceneQcReviewFormController = ReturnType<typeof useSceneQcReviewForm>;

type SceneQcMobileDrawerProps = {
  studioId: string;
  open: boolean;
  detail: SceneQcDailyItemDetail | undefined;
  isLoading: boolean;
  isError: boolean;
  form: SceneQcReviewFormController;
  onSave: () => void;
  onOpenChange: (open: boolean) => void;
};

type SceneQcMobileReviewContentProps = {
  studioId: string;
  detail: SceneQcDailyItemDetail;
  form: SceneQcReviewFormController;
  onSave: () => void;
};

/**
 * Owns the Live/Expected toggle + evidence-index local UI state for ONE
 * Show. Rendered with `key={detail.show.id}` by the parent so a Show change
 * remounts a fresh instance (both reset to their defaults) instead of
 * needing a `useEffect`, while the outer `SceneQcMobileDrawer` shell (and
 * its open/close animation) stays stable.
 */
function SceneQcMobileReviewContent({ studioId, detail, form, onSave }: SceneQcMobileReviewContentProps) {
  const [side, setSide] = useState<'live' | 'expected'>('live');
  const [evidenceIndex, setEvidenceIndex] = useState(0);

  const activeEvidence = detail.evidence[Math.min(evidenceIndex, Math.max(detail.evidence.length - 1, 0))];
  const isBlocked = detail.allowed_actions.blocked_reason === 'NO_EVIDENCE';
  const isConfirmed = detail.allowed_actions.blocked_reason === 'CONFIRMED';
  const isNotEligible = detail.allowed_actions.blocked_reason === 'NOT_ELIGIBLE';

  return (
    <div className="flex flex-1 flex-col gap-3 p-3">
      <div className="inline-flex self-start rounded-md border bg-muted/30 p-1">
        <Button type="button" size="sm" variant={side === 'live' ? 'secondary' : 'ghost'} onClick={() => setSide('live')}>
          Live
        </Button>
        <Button type="button" size="sm" variant={side === 'expected' ? 'secondary' : 'ghost'} onClick={() => setSide('expected')}>
          Expected
        </Button>
      </div>

      {side === 'live'
        ? (
            <div className="space-y-2">
              {activeEvidence
                ? <SceneQcImageFrame key={activeEvidence.file_url} src={activeEvidence.file_url} alt={activeEvidence.label} />
                : <div className="flex min-h-[16rem] items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">No evidence</div>}
              <SceneQcEvidenceSelector evidence={detail.evidence} selectedIndex={evidenceIndex} onSelect={setEvidenceIndex} />
            </div>
          )
        : (
            <SceneQcExpectedReferencePanel sceneProfile={detail.scene_profile} />
          )}

      {form.conflictMessage
        ? (
            <div className="flex items-center justify-between rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
              <span>{form.conflictMessage}</span>
              <button type="button" className="underline" onClick={form.dismissConflict}>Dismiss</button>
            </div>
          )
        : null}

      {isBlocked
        ? <SceneQcBlockedPanel />
        : isConfirmed
          ? <div className="rounded-md border p-3 text-sm text-muted-foreground">This review has been confirmed and can no longer be edited.</div>
          : isNotEligible
            ? (
                <div className="rounded-md border p-3 text-sm text-muted-foreground">
                  This Show has moved outside the selected operational day and cannot be reviewed here. Select the
                  operational date it now falls on to review it.
                </div>
              )
            : (
                <div className="sticky bottom-0 -mx-3 mt-auto border-t bg-background p-3">
                  <SceneQcResultForm
                    studioId={studioId}
                    result={form.result}
                    onResultChange={form.setResult}
                    feedback={form.feedback}
                    onFeedbackChange={form.setFeedback}
                    findings={form.findings}
                    onFindingsChange={form.setFindings}
                    findingsMissing={form.findingsMissing}
                    taxonomy={form.taxonomy}
                    sceneType={form.sceneType}
                    canSave={form.canSave}
                    isSaving={form.isSaving}
                    onSave={onSave}
                    onSelectUnusableImage={form.selectUnusableImage}
                  />
                </div>
              )}
    </div>
  );
}

/**
 * §7.4: full-height drawer. Show context -> Live/Expected segmented toggle
 * -> image + selector -> result controls -> inline feedback -> sticky Save &
 * next. No compressed two-column view, no swipe gestures.
 */
export function SceneQcMobileDrawer({ studioId, open, detail, isLoading, isError, form, onSave, onOpenChange }: SceneQcMobileDrawerProps) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="flex h-[100dvh] max-h-[100dvh] flex-col">
        <DrawerHeader className="border-b text-left">
          <DrawerTitle>{detail?.show.name ?? 'Scene QC Review'}</DrawerTitle>
          <DrawerDescription className="sr-only">Review the selected Show's Scene QC evidence.</DrawerDescription>
        </DrawerHeader>

        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain">
          {isLoading
            ? (
                <div className="space-y-3 p-4">
                  <Skeleton className="h-64 w-full" />
                  <Skeleton className="h-24 w-full" />
                </div>
              )
            : isError
              ? <div className="p-6 text-center text-sm text-destructive">Unable to load this Show's Scene QC context.</div>
              : !detail
                  ? <div className="p-6 text-center text-sm text-muted-foreground">Select a Show to begin review.</div>
                  : <SceneQcMobileReviewContent key={detail.show.id} studioId={studioId} detail={detail} form={form} onSave={onSave} />}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
