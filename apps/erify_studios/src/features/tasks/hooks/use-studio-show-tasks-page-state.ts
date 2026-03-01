import type { RowSelectionState } from '@tanstack/react-table';
import { useCallback, useMemo, useState } from 'react';

import type { TaskAction, TaskWithRelationsDto } from '@eridu/api-types/task-management';

export type TaskActionDraft = {
  task: TaskWithRelationsDto;
  action: TaskAction;
};

export function useStudioShowTasksPageState() {
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isGenerateDialogOpen, setIsGenerateDialogOpen] = useState(false);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [isShowDetailsOpen, setIsShowDetailsOpen] = useState(false);
  const [actionDraft, setActionDraft] = useState<TaskActionDraft | null>(null);
  const [dueDateTask, setDueDateTask] = useState<TaskWithRelationsDto | null>(null);

  const selectedUids = useMemo(() => {
    return Object.entries(rowSelection)
      .filter(([, isSelected]) => isSelected)
      .map(([id]) => id);
  }, [rowSelection]);

  const handleDeleteMutationSuccess = useCallback(() => {
    setRowSelection({});
    setIsDeleteDialogOpen(false);
  }, []);
  const handleToggleShowDetails = useCallback(() => {
    setIsShowDetailsOpen((prev) => !prev);
  }, []);
  const handleTaskActionSheetOpenChange = useCallback((open: boolean) => {
    if (!open) {
      setActionDraft(null);
    }
  }, []);
  const handleDueDateDialogOpenChange = useCallback((open: boolean) => {
    if (!open) {
      setDueDateTask(null);
    }
  }, []);

  const openGenerateDialog = useCallback(() => {
    setIsGenerateDialogOpen(true);
  }, []);
  const openAssignDialog = useCallback(() => {
    setIsAssignDialogOpen(true);
  }, []);
  const openDeleteDialog = useCallback(() => {
    setIsDeleteDialogOpen(true);
  }, []);
  const openDueDateEditor = useCallback((task: TaskWithRelationsDto) => {
    setDueDateTask(task);
  }, []);
  const openTaskActionDraft = useCallback((task: TaskWithRelationsDto, action: TaskAction) => {
    setActionDraft({ task, action });
  }, []);
  const clearTaskActionDraft = useCallback(() => {
    setActionDraft(null);
  }, []);
  const clearDueDateTask = useCallback(() => {
    setDueDateTask(null);
  }, []);

  return {
    rowSelection,
    setRowSelection,
    selectedUids,
    selectedCount: selectedUids.length,
    isDeleteDialogOpen,
    setIsDeleteDialogOpen,
    isGenerateDialogOpen,
    setIsGenerateDialogOpen,
    isAssignDialogOpen,
    setIsAssignDialogOpen,
    isShowDetailsOpen,
    actionDraft,
    dueDateTask,
    handleDeleteMutationSuccess,
    handleToggleShowDetails,
    handleTaskActionSheetOpenChange,
    handleDueDateDialogOpenChange,
    openGenerateDialog,
    openAssignDialog,
    openDeleteDialog,
    openDueDateEditor,
    openTaskActionDraft,
    clearTaskActionDraft,
    clearDueDateTask,
  };
}
