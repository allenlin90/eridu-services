import { Copy, MoreHorizontal, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Badge,
  Button,
  Checkbox,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Input,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Textarea,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@eridu/ui';

import { type BuilderTemplateSchemaType, isSharedField } from './schema';
import {
  addMechanic,
  appendLoop,
  assignMechanicToLoop,
  buildLoopMetadataFromTemplate,
  cloneLoopWithMechanics,
  deleteLoop,
  deleteMechanic,
  detectMechanicDrift,
  getMechanicAssignments,
  getMechanics,
  type Mechanic,
  migrateMechanicLibrary,
  renameLoop,
  renameMechanic,
  resyncMechanicFromItems,
  setMechanicDescription,
  unassignMechanicFromLoop,
} from './task-template-helpers';

export type TaskTemplateLoopGridProps = {
  template: BuilderTemplateSchemaType;
  onChange: (template: BuilderTemplateSchemaType) => void;
  errors?: Record<string, string[]>;
};

const LOOP_COL_WIDTH = 'w-[220px]';
const MECHANIC_COL_WIDTH = 'min-w-[180px]';

export function TaskTemplateLoopGrid({ template, onChange, errors }: TaskTemplateLoopGridProps) {
  const migratedRef = useRef(false);

  useEffect(() => {
    if (migratedRef.current)
      return;
    const migrated = migrateMechanicLibrary(template);
    if (migrated !== template) {
      migratedRef.current = true;
      onChange(migrated);
      toast.info('Mechanic library populated from existing checkbox fields.');
    } else {
      migratedRef.current = true;
    }
    // Only run once on mount; subsequent template changes use the persisted library.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loops = useMemo(() => buildLoopMetadataFromTemplate(template), [template]);
  const mechanics = useMemo(() => getMechanics(template), [template]);
  const assignments = useMemo(() => getMechanicAssignments(template), [template]);
  const driftedIds = useMemo(() => detectMechanicDrift(template), [template]);

  const usageByMechanic = useMemo(() => {
    const counts = new Map<string, number>();
    for (const item of template.items) {
      const mechanicId = assignments[item.id];
      if (!mechanicId)
        continue;
      counts.set(mechanicId, (counts.get(mechanicId) ?? 0) + 1);
    }
    return counts;
  }, [assignments, template.items]);

  const assignedItemKey = useMemo(() => {
    // Map: `${loopId}::${mechanicId}` -> itemId, for fast checkbox state lookup.
    const map = new Map<string, string>();
    for (const item of template.items) {
      const mechanicId = assignments[item.id];
      if (!mechanicId || !item.group)
        continue;
      map.set(`${item.group}::${mechanicId}`, item.id);
    }
    return map;
  }, [assignments, template.items]);

  const sharedFieldCount = useMemo(
    () =>
      template.items.filter(
        (item) =>
          item.type === 'checkbox'
          && isSharedField(item as { standard?: boolean; shared_field_key?: string }),
      ).length,
    [template.items],
  );

  const nonMechanicByLoop = useMemo(() => {
    const counts = new Map<string, number>();
    for (const item of template.items) {
      if (!item.group)
        continue;
      const isLibraryCheckbox
        = item.type === 'checkbox'
        && assignments[item.id]
        && !isSharedField(item as { standard?: boolean; shared_field_key?: string });
      if (isLibraryCheckbox)
        continue;
      counts.set(item.group, (counts.get(item.group) ?? 0) + 1);
    }
    return counts;
  }, [assignments, template.items]);

  const itemErrorIds = useMemo(() => {
    if (!errors)
      return new Set<string>();
    const ids = new Set<string>();
    for (const [path] of Object.entries(errors)) {
      const match = path.match(/^items\.(\d+)/);
      if (!match)
        continue;
      const index = Number(match[1]);
      const item = template.items[index];
      if (item?.id)
        ids.add(item.id);
    }
    return ids;
  }, [errors, template.items]);

  const mechanicsInError = useMemo(() => {
    const ids = new Set<string>();
    for (const [itemId, mechanicId] of Object.entries(assignments)) {
      if (itemErrorIds.has(itemId))
        ids.add(mechanicId);
    }
    return ids;
  }, [assignments, itemErrorIds]);

  // ---- Mutations -----------------------------------------------------------

  const handleAddMechanic = useCallback(() => {
    const { template: next, mechanic } = addMechanic(template, 'New mechanic');
    onChange(next);
    toast.success(`Added mechanic "${mechanic.label}". Assign it to loops with the checkboxes below.`);
  }, [onChange, template]);

  const handleRenameMechanic = useCallback(
    (mechanicId: string, nextLabel: string) => {
      const trimmed = nextLabel.trim();
      if (!trimmed)
        return;
      onChange(renameMechanic(template, mechanicId, trimmed));
    },
    [onChange, template],
  );

  const handleEditDescription = useCallback(
    (mechanicId: string, description: string) => {
      onChange(setMechanicDescription(template, mechanicId, description));
    },
    [onChange, template],
  );

  const handleDeleteMechanic = useCallback(
    (mechanicId: string) => {
      const removedCount = usageByMechanic.get(mechanicId) ?? 0;
      onChange(deleteMechanic(template, mechanicId));
      toast.success(
        removedCount > 0
          ? `Deleted mechanic and removed it from ${removedCount} loop${removedCount === 1 ? '' : 's'}.`
          : 'Deleted mechanic.',
      );
    },
    [onChange, template, usageByMechanic],
  );

  const handleToggleAssignment = useCallback(
    (mechanicId: string, loopId: string, checked: boolean) => {
      if (checked) {
        onChange(assignMechanicToLoop(template, mechanicId, loopId));
      } else {
        onChange(unassignMechanicFromLoop(template, mechanicId, loopId));
      }
    },
    [onChange, template],
  );

  const handleResyncMechanic = useCallback(
    (mechanicId: string) => {
      onChange(resyncMechanicFromItems(template, mechanicId));
      toast.success('Mechanic re-synced from the most recent Cards-view edit.');
    },
    [onChange, template],
  );

  const handleAddLoop = useCallback(() => {
    const { template: next } = appendLoop(template);
    onChange(next);
  }, [onChange, template]);

  const handleCloneLoop = useCallback(
    (loopId: string) => {
      const { template: next } = cloneLoopWithMechanics(template, loopId);
      onChange(next);
    },
    [onChange, template],
  );

  const handleDeleteLoop = useCallback(
    (loopId: string) => {
      onChange(deleteLoop(template, loopId));
    },
    [onChange, template],
  );

  const handleRenameLoop = useCallback(
    (loopId: string, nextName: string) => {
      const trimmed = nextName.trim();
      if (!trimmed)
        return;
      onChange(renameLoop(template, loopId, trimmed));
    },
    [onChange, template],
  );

  const hasMechanics = mechanics.length > 0;
  const hasLoops = loops.length > 0;

  return (
    <div className="space-y-6">
      <MechanicLibraryPanel
        mechanics={mechanics}
        usage={usageByMechanic}
        drifted={driftedIds}
        errors={mechanicsInError}
        onAdd={handleAddMechanic}
        onRename={handleRenameMechanic}
        onDescription={handleEditDescription}
        onDelete={handleDeleteMechanic}
        onResync={handleResyncMechanic}
      />

      <div className="rounded-lg border bg-card shadow-sm">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div>
            <h4 className="text-sm font-semibold">Loop × Mechanic</h4>
            <p className="text-xs text-muted-foreground">
              Tick a cell to play the mechanic in that loop. Untick to remove it.
            </p>
          </div>
          <Button size="sm" variant="outline" onClick={handleAddLoop}>
            <Plus className="mr-1 h-4 w-4" />
            Add Loop
          </Button>
        </div>

        {sharedFieldCount > 0 && (
          <div className="border-b bg-amber-50/60 px-4 py-2 text-xs text-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
            {sharedFieldCount}
            {' '}
            shared field
            {sharedFieldCount === 1 ? ' is' : 's are'}
            {' '}
            hidden from the matrix — edit them in Cards view or Shared Fields settings.
          </div>
        )}

        {!hasLoops
          ? (
              <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                No loops yet. Click
                {' '}
                <span className="font-medium">Add Loop</span>
                {' '}
                to start.
              </div>
            )
          : !hasMechanics
              ? (
                  <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                    Add a mechanic above to populate the matrix.
                  </div>
                )
              : (
                  <div className="overflow-x-auto">
                    <Table className="min-w-max">
                      <TableHeader>
                        <TableRow>
                          <TableHead className={`sticky left-0 z-10 bg-muted/40 ${LOOP_COL_WIDTH}`}>Loop</TableHead>
                          {mechanics.map((mechanic) => (
                            <TableHead key={mechanic.id} className={`${MECHANIC_COL_WIDTH} text-center`}>
                              <div className="flex flex-col items-center gap-0.5">
                                <span className={`max-w-[200px] truncate text-sm font-medium ${mechanicsInError.has(mechanic.id) ? 'text-destructive' : ''}`} title={mechanic.label}>
                                  {mechanic.label || 'Untitled'}
                                </span>
                                {driftedIds.has(mechanic.id) && (
                                  <Badge variant="outline" className="border-amber-300 text-[10px] text-amber-700">
                                    drift
                                  </Badge>
                                )}
                              </div>
                            </TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {loops.map((loop) => {
                          const extras = nonMechanicByLoop.get(loop.id) ?? 0;
                          return (
                            <TableRow key={loop.id}>
                              <TableCell className={`sticky left-0 z-10 bg-card align-top ${LOOP_COL_WIDTH}`}>
                                <LoopRowHeader
                                  name={loop.name}
                                  extras={extras}
                                  onRename={(next) => handleRenameLoop(loop.id, next)}
                                  onClone={() => handleCloneLoop(loop.id)}
                                  onDelete={() => handleDeleteLoop(loop.id)}
                                />
                              </TableCell>
                              {mechanics.map((mechanic) => {
                                const isAssigned = assignedItemKey.has(`${loop.id}::${mechanic.id}`);
                                return (
                                  <TableCell key={mechanic.id} className="text-center">
                                    <Checkbox
                                      checked={isAssigned}
                                      onCheckedChange={(value) =>
                                        handleToggleAssignment(mechanic.id, loop.id, value === true)}
                                      aria-label={`${mechanic.label || 'Untitled'} in ${loop.name}`}
                                    />
                                  </TableCell>
                                );
                              })}
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
      </div>
    </div>
  );
}

export default TaskTemplateLoopGrid;

// ---------------------------------------------------------------------------
// Subcomponents
// ---------------------------------------------------------------------------

type MechanicLibraryPanelProps = {
  mechanics: Mechanic[];
  usage: Map<string, number>;
  drifted: Set<string>;
  errors: Set<string>;
  onAdd: () => void;
  onRename: (mechanicId: string, nextLabel: string) => void;
  onDescription: (mechanicId: string, description: string) => void;
  onDelete: (mechanicId: string) => void;
  onResync: (mechanicId: string) => void;
};

function MechanicLibraryPanel({
  mechanics,
  usage,
  drifted,
  errors,
  onAdd,
  onRename,
  onDescription,
  onDelete,
  onResync,
}: MechanicLibraryPanelProps) {
  return (
    <div className="rounded-lg border bg-card shadow-sm">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div>
          <h4 className="text-sm font-semibold">Mechanics</h4>
          <p className="text-xs text-muted-foreground">
            Edit a mechanic once — every loop that uses it updates automatically.
          </p>
        </div>
        <Button size="sm" onClick={onAdd}>
          <Plus className="mr-1 h-4 w-4" />
          Add mechanic
        </Button>
      </div>

      {mechanics.length === 0
        ? (
            <div className="px-4 py-6 text-center text-sm text-muted-foreground">
              No mechanics yet. Add one to start, or open an existing template — the library
              auto-populates from existing checkbox cue cards on first load.
            </div>
          )
        : (
            <ul className="divide-y">
              {mechanics.map((mechanic) => (
                <MechanicRow
                  key={mechanic.id}
                  mechanic={mechanic}
                  usageCount={usage.get(mechanic.id) ?? 0}
                  isDrifted={drifted.has(mechanic.id)}
                  hasError={errors.has(mechanic.id)}
                  onRename={(next) => onRename(mechanic.id, next)}
                  onDescription={(next) => onDescription(mechanic.id, next)}
                  onDelete={() => onDelete(mechanic.id)}
                  onResync={() => onResync(mechanic.id)}
                />
              ))}
            </ul>
          )}
    </div>
  );
}

type MechanicRowProps = {
  mechanic: Mechanic;
  usageCount: number;
  isDrifted: boolean;
  hasError: boolean;
  onRename: (nextLabel: string) => void;
  onDescription: (description: string) => void;
  onDelete: () => void;
  onResync: () => void;
};

function MechanicRow({
  mechanic,
  usageCount,
  isDrifted,
  hasError,
  onRename,
  onDescription,
  onDelete,
  onResync,
}: MechanicRowProps) {
  const [label, setLabel] = useState(mechanic.label);
  const [description, setDescription] = useState(mechanic.description ?? '');
  const [showDescription, setShowDescription] = useState(Boolean(mechanic.description));
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Sync local state when the parent passes a new mechanic value (rename,
  // resync). Use the prevProp-state pattern so we don't read a ref during
  // render (react-hooks/refs).
  const [prevLabel, setPrevLabel] = useState(mechanic.label);
  const [prevDescription, setPrevDescription] = useState(mechanic.description ?? '');
  if (mechanic.label !== prevLabel) {
    setPrevLabel(mechanic.label);
    setLabel(mechanic.label);
  }
  if ((mechanic.description ?? '') !== prevDescription) {
    setPrevDescription(mechanic.description ?? '');
    setDescription(mechanic.description ?? '');
  }

  const commitLabel = () => {
    if (label.trim() && label !== mechanic.label) {
      onRename(label);
    } else if (!label.trim()) {
      setLabel(mechanic.label);
    }
  };

  const commitDescription = () => {
    if (description !== (mechanic.description ?? '')) {
      onDescription(description);
    }
  };

  return (
    <li className="flex flex-col gap-2 px-4 py-3">
      <div className="flex items-start gap-3">
        <div className="flex-1 space-y-1">
          <Input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            onBlur={commitLabel}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                e.currentTarget.blur();
              }
              if (e.key === 'Escape') {
                setLabel(mechanic.label);
                e.currentTarget.blur();
              }
            }}
            placeholder="Mechanic label (read aloud by the moderator)"
            className={hasError ? 'border-destructive focus-visible:ring-destructive' : ''}
            aria-label="Mechanic label"
          />
          {showDescription && (
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onBlur={commitDescription}
              placeholder="Optional context for moderators"
              className="min-h-[60px] text-sm"
              aria-label="Mechanic description"
            />
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2 pt-1">
          <Badge variant="secondary" className="text-xs">
            {usageCount === 0
              ? 'Not used'
              : `Used in ${usageCount} loop${usageCount === 1 ? '' : 's'}`}
          </Badge>
          {isDrifted && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={onResync}
                    aria-label="Re-sync mechanic label from Cards-view edits"
                  >
                    <RefreshCw className="h-4 w-4 text-amber-600" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  A linked field's label differs from the library. Click to re-sync.
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="icon" variant="ghost" aria-label="Mechanic actions">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => setShowDescription((v) => !v)}>
                {showDescription ? 'Hide description' : 'Add description'}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onSelect={() => setConfirmDelete(true)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete mechanic
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete mechanic?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the mechanic from the library and from
              {' '}
              {usageCount}
              {' '}
              loop
              {usageCount === 1 ? '' : 's'}
              . You can re-add it later, but existing assignments will be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                onDelete();
                setConfirmDelete(false);
              }}
              className="bg-destructive hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </li>
  );
}

type LoopRowHeaderProps = {
  name: string;
  extras: number;
  onRename: (next: string) => void;
  onClone: () => void;
  onDelete: () => void;
};

function LoopRowHeader({ name, extras, onRename, onClone, onDelete }: LoopRowHeaderProps) {
  const [local, setLocal] = useState(name);
  const [prevName, setPrevName] = useState(name);
  if (name !== prevName) {
    setPrevName(name);
    setLocal(name);
  }

  const commit = () => {
    if (local.trim() && local !== name) {
      onRename(local);
    } else if (!local.trim()) {
      setLocal(name);
    }
  };

  return (
    <div className="flex flex-col gap-1">
      <Input
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            e.currentTarget.blur();
          }
        }}
        className="h-8 text-sm font-medium"
        aria-label="Loop name"
      />
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          {extras === 0
            ? 'Mechanics only'
            : `+${extras} non-mechanic field${extras === 1 ? '' : 's'}`}
        </span>
        <div className="flex">
          <Button size="icon" variant="ghost" onClick={onClone} aria-label="Clone loop" className="h-7 w-7">
            <Copy className="h-3 w-3" />
          </Button>
          <Button size="icon" variant="ghost" onClick={onDelete} aria-label="Delete loop" className="h-7 w-7 hover:text-destructive">
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </div>
  );
}
