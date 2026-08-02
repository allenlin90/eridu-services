import { ArrowUpCircle, CheckCircle2, RotateCcw } from 'lucide-react';
import { useState } from 'react';

import type { ShowIssueApiResponse } from '@eridu/api-types/show-issues';
import { DataTableActions, DropdownMenuItem } from '@eridu/ui';

import { ShowIssueEditDialog } from './show-issue-edit-dialog';
import { ShowIssueEscalateDialog } from './show-issue-escalate-dialog';
import { ShowIssueReopenDialog } from './show-issue-reopen-dialog';
import { ShowIssueResolveDialog } from './show-issue-resolve-dialog';

type ShowIssueActionsCellProps = {
  studioId: string;
  showId: string;
  issue: ShowIssueApiResponse;
  currentUserUid: string | undefined;
  canManageIssues: boolean;
};

/**
 * Row actions for a show issue, gated by role + ownership per the
 * Authorization matrix in SHOW_ISSUE_OWNERSHIP.md. The backend
 * enforces these rules regardless; this only avoids presenting an action
 * that would always 403 (e.g. a non-owner member trying to resolve someone
 * else's issue).
 */
export function ShowIssueActionsCell({
  studioId,
  showId,
  issue,
  currentUserUid,
  canManageIssues,
}: ShowIssueActionsCellProps) {
  const [editOpen, setEditOpen] = useState(false);
  const [resolveOpen, setResolveOpen] = useState(false);
  const [reopenOpen, setReopenOpen] = useState(false);
  const [escalateOpen, setEscalateOpen] = useState(false);

  const isOwnIssue = Boolean(currentUserUid) && issue.owner?.uid === currentUserUid;
  const isResolved = issue.status === 'RESOLVED';
  const isOpen = issue.status === 'OPEN';

  const canEditFull = canManageIssues;
  const canStartOwn = !canManageIssues && isOwnIssue && isOpen;
  const canEdit = canEditFull || canStartOwn;
  const editMode: 'full' | 'start-only' = canEditFull ? 'full' : 'start-only';

  const canResolve = !isResolved && (canManageIssues || isOwnIssue);
  const canReopen = canManageIssues && isResolved;
  const canEscalate = canManageIssues && !isResolved;

  if (!canEdit && !canResolve && !canReopen && !canEscalate) {
    return null;
  }

  return (
    <>
      <DataTableActions
        row={issue}
        onEdit={canEdit ? () => setEditOpen(true) : undefined}
        renderExtraActions={() => (
          <>
            {canResolve && (
              <DropdownMenuItem onClick={() => setResolveOpen(true)}>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Resolve
              </DropdownMenuItem>
            )}
            {canReopen && (
              <DropdownMenuItem onClick={() => setReopenOpen(true)}>
                <RotateCcw className="mr-2 h-4 w-4" />
                Reopen
              </DropdownMenuItem>
            )}
            {canEscalate && (
              <DropdownMenuItem onClick={() => setEscalateOpen(true)}>
                <ArrowUpCircle className="mr-2 h-4 w-4" />
                Escalate
              </DropdownMenuItem>
            )}
          </>
        )}
      />

      {canEdit && (
        <ShowIssueEditDialog
          issue={editOpen ? issue : null}
          onOpenChange={setEditOpen}
          studioId={studioId}
          showId={showId}
          mode={editMode}
        />
      )}
      {canResolve && (
        <ShowIssueResolveDialog
          issue={resolveOpen ? issue : null}
          onOpenChange={setResolveOpen}
          studioId={studioId}
          showId={showId}
        />
      )}
      {canReopen && (
        <ShowIssueReopenDialog
          issue={reopenOpen ? issue : null}
          onOpenChange={setReopenOpen}
          studioId={studioId}
          showId={showId}
        />
      )}
      {canEscalate && (
        <ShowIssueEscalateDialog
          issue={escalateOpen ? issue : null}
          onOpenChange={setEscalateOpen}
          studioId={studioId}
          showId={showId}
        />
      )}
    </>
  );
}
