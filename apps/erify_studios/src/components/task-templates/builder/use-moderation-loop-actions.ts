import { arrayMove } from '@dnd-kit/sortable';
import { type RefObject, useCallback } from 'react';
import { toast } from 'sonner';

import { createTaskTemplateFieldId, getSchemaEngine } from '@eridu/api-types/task-management';

import type { BuilderTemplateSchemaType, LoopMetadata } from './schema';
import {
  createNextLoop,
  createTextFieldForTemplate,
  createUniqueCopiedKey,
  DEFAULT_LOOP_DURATION_MIN,
  omitLoopsFromMetadata,
  stripSourceLoopSuffix,
} from './task-template-builder.utils';

type LatestBuilderProps = {
  template: BuilderTemplateSchemaType;
  onChange: (template: BuilderTemplateSchemaType) => void;
};

export type ModerationLoopActions = {
  toggleCollapse: (loopId: string) => void;
  cloneLoop: (loop: LoopMetadata) => void;
  removeLoop: (loop: LoopMetadata, loopIndex: number) => void;
  renameLoop: (loopIndex: number, name: string) => void;
  changeDuration: (loopIndex: number, rawValue: string) => void;
  reorderLoop: (loopIndex: number, rawValue: string) => void;
  addField: (loopId: string) => void;
};

/** Owns template mutations initiated by the moderation-loop card list. */
export function useModerationLoopActions(input: {
  propsRef: RefObject<LatestBuilderProps>;
  loops: LoopMetadata[];
  setCollapsedLoops: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
}): ModerationLoopActions {
  const { propsRef, loops, setCollapsedLoops } = input;

  const toggleCollapse = useCallback((loopId: string) => {
    setCollapsedLoops((previous) => ({
      ...previous,
      [loopId]: !(previous[loopId] ?? false),
    }));
  }, [setCollapsedLoops]);

  const cloneLoop = useCallback((loop: LoopMetadata) => {
    const { template, onChange } = propsRef.current;
    const engine = getSchemaEngine(template);
    const sourceItems = template.items.filter((item) => item.group === loop.id);
    if (engine === 'task_template_v1' && sourceItems.some((item) => 'standard' in item && item.standard)) {
      toast.error(
        'Shared fields can\'t be cloned on this template version. Add a new loop and use the shared field picker instead.',
      );
      return;
    }
    const loopBase = createNextLoop(loops);
    const clonedLoop: LoopMetadata = {
      ...loopBase,
      name: `${loop.name} (Copy)`,
      durationMin: loop.durationMin,
    };
    const usedKeys = new Set(template.items.map((item) => item.key));
    const clonedItems = sourceItems.map((item) => {
      if (engine === 'task_template_v2') {
        const cloned = structuredClone(item);
        cloned.id = createTaskTemplateFieldId();
        cloned.key = stripSourceLoopSuffix(cloned.key, item.group) ?? cloned.key;
        const sourceSharedKey = (cloned as { shared_field_key?: string }).shared_field_key;
        if (sourceSharedKey) {
          (cloned as { shared_field_key?: string }).shared_field_key = stripSourceLoopSuffix(sourceSharedKey, item.group);
        }
        cloned.group = clonedLoop.id;
        return cloned;
      }
      return {
        ...structuredClone(item),
        id: crypto.randomUUID(),
        key: createUniqueCopiedKey(item.key, usedKeys),
        group: clonedLoop.id,
      };
    });
    onChange({
      ...template,
      metadata: { ...(template.metadata ?? {}), loops: [...loops, clonedLoop] },
      items: [...template.items, ...clonedItems],
    });
    setCollapsedLoops((previous) => ({ ...previous, [clonedLoop.id]: false }));
  }, [loops, propsRef, setCollapsedLoops]);

  const removeLoop = useCallback((loop: LoopMetadata, loopIndex: number) => {
    const nextLoops = [...loops];
    nextLoops.splice(loopIndex, 1);
    const { template, onChange } = propsRef.current;
    setCollapsedLoops((previous) => {
      const next = { ...previous };
      delete next[loop.id];
      return next;
    });
    onChange({
      ...template,
      metadata: nextLoops.length > 0
        ? { ...(template.metadata ?? {}), loops: nextLoops }
        : omitLoopsFromMetadata(template.metadata),
      items: template.items.filter((item) => item.group !== loop.id),
    });
  }, [loops, propsRef, setCollapsedLoops]);

  const updateLoop = useCallback((loopIndex: number, patch: Partial<LoopMetadata>) => {
    const { template, onChange } = propsRef.current;
    onChange({
      ...template,
      metadata: {
        ...(template.metadata ?? {}),
        loops: loops.map((loop, index) => index === loopIndex ? { ...loop, ...patch } : loop),
      },
    });
  }, [loops, propsRef]);

  const changeDuration = useCallback((loopIndex: number, rawValue: string) => {
    const parsed = Number.parseInt(rawValue, 10);
    updateLoop(loopIndex, {
      durationMin: Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_LOOP_DURATION_MIN,
    });
  }, [updateLoop]);

  const reorderLoop = useCallback((loopIndex: number, rawValue: string) => {
    const parsed = Number.parseInt(rawValue, 10);
    const targetIndex = Number.isFinite(parsed) ? parsed - 1 : loopIndex;
    if (targetIndex === loopIndex || targetIndex < 0 || targetIndex >= loops.length)
      return;
    const { template, onChange } = propsRef.current;
    onChange({
      ...template,
      metadata: { ...(template.metadata ?? {}), loops: arrayMove(loops, loopIndex, targetIndex) },
    });
  }, [loops, propsRef]);

  const addField = useCallback((loopId: string) => {
    const { template, onChange } = propsRef.current;
    onChange({
      ...template,
      items: [...template.items, createTextFieldForTemplate(template, loopId)],
    });
  }, [propsRef]);

  return {
    toggleCollapse,
    cloneLoop,
    removeLoop,
    renameLoop: (loopIndex, name) => updateLoop(loopIndex, { name }),
    changeDuration,
    reorderLoop,
    addField,
  };
}
