import { MessageSquarePlus } from 'lucide-react';
import { useState } from 'react';

import type { SceneQcRecordDetail } from '@eridu/api-types/scene-qc';
import { Button } from '@eridu/ui';

import { SceneQcAmendmentForm } from './scene-qc-amendment-form';

export function SceneQcRecordHistory({
  studioId,
  detail,
}: {
  studioId: string;
  detail: SceneQcRecordDetail;
}) {
  const [amendmentOpen, setAmendmentOpen] = useState(false);
  return (
    <>
      <div className="space-y-2 rounded-md border p-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-xs font-medium text-muted-foreground">Comments and corrections</p>
            <p className="text-xs text-muted-foreground">Append-only: past entries and the confirmed review are never edited.</p>
          </div>
          {detail.review.confirmed_at && !amendmentOpen
            ? (
                <Button type="button" size="sm" variant="outline" onClick={() => setAmendmentOpen(true)}>
                  <MessageSquarePlus className="mr-2 h-4 w-4" />
                  Add entry
                </Button>
              )
            : null}
        </div>
        {detail.amendments.length === 0
          ? <p className="text-xs text-muted-foreground">No appended entries.</p>
          : (
              <ol className="space-y-2">
                {detail.amendments.map((amendment) => (
                  <li key={amendment.id} className="rounded bg-muted/30 p-2 text-sm">
                    <div className="flex justify-between gap-2 text-xs text-muted-foreground">
                      <span>
                        #
                        {amendment.revision}
                        {' '}
                        ·
                        {' '}
                        {amendment.created_by.name}
                      </span>
                      <span>{new Date(amendment.created_at).toLocaleString()}</span>
                    </div>
                    {amendment.result
                      ? (
                          <p className="font-medium">
                            Corrected result:
                            {' '}
                            {amendment.result}
                          </p>
                        )
                      : null}
                    <p>{amendment.note}</p>
                  </li>
                ))}
              </ol>
            )}
        {amendmentOpen
          ? (
              <SceneQcAmendmentForm
                studioId={studioId}
                reviewId={detail.review.id}
                sceneType={detail.review.expected_reference?.scene_type ?? null}
                onCancel={() => setAmendmentOpen(false)}
              />
            )
          : null}
      </div>

      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground">Audit history</p>
        {detail.audit_history.length === 0
          ? <p className="text-xs text-muted-foreground">No changes recorded.</p>
          : (
              <ul className="space-y-1.5 text-xs">
                {detail.audit_history.map((entry) => (
                  <li key={entry.id} className="flex items-center justify-between gap-2 border-b pb-1.5 last:border-b-0">
                    <span>
                      {entry.actor?.name ?? 'System'}
                      {' '}
                      {entry.action === 'CREATE' ? 'created' : 'updated'}
                      {' '}
                      {entry.new_result ? `→ ${entry.new_result}` : ''}
                    </span>
                    <span className="text-muted-foreground">{new Date(entry.at).toLocaleString()}</span>
                  </li>
                ))}
              </ul>
            )}
      </div>
    </>
  );
}
