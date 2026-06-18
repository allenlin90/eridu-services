import { Link } from '@tanstack/react-router';
import { Plus } from 'lucide-react';

import type { SharedField } from '@eridu/api-types/task-management';
import {
  Button,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@eridu/ui';

import type { LoopMetadata } from './schema';
import type { SharedFieldInsertionPreview } from './task-template-builder.types';

/**
 * Shared-field insertion surface. Renders one of two states purely from props:
 * an empty-state guide (with a settings link when the user can manage shared
 * fields) when no active shared fields exist, or the field/loop picker + live
 * insertion preview otherwise. All selection and insertion is delegated to the
 * builder via callbacks; this component holds no state.
 */
export function SharedFieldInserter({
  activeSharedFields,
  studioId,
  canManageSharedFields,
  isModerationMode,
  moderationLoops,
  resolvedSharedFieldKey,
  resolvedSharedFieldLoopId,
  insertionPreview,
  onSelectSharedField,
  onSelectLoop,
  onAddSharedField,
}: {
  activeSharedFields: SharedField[];
  studioId?: string;
  canManageSharedFields: boolean;
  isModerationMode: boolean;
  moderationLoops: LoopMetadata[];
  resolvedSharedFieldKey: string;
  resolvedSharedFieldLoopId?: string;
  insertionPreview: SharedFieldInsertionPreview | null;
  onSelectSharedField: (key: string) => void;
  onSelectLoop: (loopId: string) => void;
  onAddSharedField: () => void;
}) {
  if (activeSharedFields.length === 0) {
    return (
      <div className="rounded-md border border-dashed bg-muted/20 p-4">
        <div className="text-sm font-semibold">No active shared fields yet</div>
        <div className="mt-1 text-sm text-muted-foreground">
          Shared fields power consistent cross-template report columns such as GMV, URLs, and status checkpoints. Create them first, then return here to insert them into the template.
        </div>
        {studioId
          ? (
              <div className="mt-3">
                {canManageSharedFields
                  ? (
                      <Button asChild variant="outline" size="sm">
                        <Link to="/studios/$studioId/shared-fields" params={{ studioId }}>
                          Open Shared Fields Settings
                        </Link>
                      </Button>
                    )
                  : (
                      <div className="text-sm text-muted-foreground">
                        Ask a studio admin to create shared fields, then return here to insert them into the template.
                      </div>
                    )}
              </div>
            )
          : null}
      </div>
    );
  }

  return (
    <div className="rounded-md border bg-muted/20 p-3">
      <div className="flex flex-col gap-2 md:flex-row md:items-end">
        <div className="grid flex-1 gap-1.5">
          <Label className="text-xs">Insert Shared Field</Label>
          <Select value={resolvedSharedFieldKey} onValueChange={onSelectSharedField}>
            <SelectTrigger>
              <SelectValue placeholder="Select shared field" />
            </SelectTrigger>
            <SelectContent>
              {activeSharedFields.map((field) => (
                <SelectItem key={field.key} value={field.key}>
                  {field.label}
                  {' '}
                  (
                  {field.key}
                  {' · '}
                  {field.type}
                  )
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {isModerationMode && moderationLoops.length > 0 && (
          <div className="grid gap-1.5 md:w-56">
            <Label className="text-xs">Target Loop</Label>
            <Select value={resolvedSharedFieldLoopId} onValueChange={onSelectLoop}>
              <SelectTrigger>
                <SelectValue placeholder="Select loop" />
              </SelectTrigger>
              <SelectContent>
                {moderationLoops.map((loop) => (
                  <SelectItem key={loop.id} value={loop.id}>
                    {loop.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        <Button
          variant="outline"
          onClick={onAddSharedField}
          disabled={!resolvedSharedFieldKey}
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Shared Field
        </Button>
      </div>
      {insertionPreview
        ? (
            <div className="mt-3 grid gap-2 md:grid-cols-2">
              <div className="rounded-md border bg-background/70 px-3 py-2">
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Insertion preview</div>
                <div className="mt-1 text-sm font-medium">{insertionPreview.title}</div>
                <div className="mt-1 text-xs text-muted-foreground">{insertionPreview.description}</div>
              </div>
              <div className="rounded-md border bg-background/70 px-3 py-2">
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Authoring rule</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  Shared fields always keep the studio-managed label and type. Use canonical shared keys for cross-template reporting, and use loop-local copies only when repeated loop slots need separate answers.
                </div>
              </div>
            </div>
          )
        : null}
    </div>
  );
}
