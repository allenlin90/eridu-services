import { useCallback, useMemo } from 'react';

import type { StudioShowDetail } from '@/features/studio-shows/api/get-studio-show';
import { getColumns } from '@/features/studio-shows/components/show-tasks-table/columns';
import { useStudioShowTasksPageData } from '@/features/tasks/hooks/use-studio-show-tasks-page-data';
import { useStudioShowTasksPageMutations } from '@/features/tasks/hooks/use-studio-show-tasks-page-mutations';
import { useStudioShowTasksPageState } from '@/features/tasks/hooks/use-studio-show-tasks-page-state';
import {
  buildCurrentShowSelection,
  buildShowMetaItems,
  buildShowSubtitle,
} from '@/features/tasks/lib/studio-show-tasks-page';

type UseStudioShowTasksPageControllerProps = {
  studioId: string;
  showId: string;
  showFromNavigation: StudioShowDetail | null;
};

export function useStudioShowTasksPageController({
  studioId,
  showId,
  showFromNavigation,
}: UseStudioShowTasksPageControllerProps) {
  const {
    rowSelection,
    setRowSelection,
    selectedUids,
    selectedCount,
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
  } = useStudioShowTasksPageState();

  const {
    members,
    taskList,
    showDetails,
    isLoadingShow,
    isTableLoading,
    isRefreshing,
    refreshAll,
    refetchShowTasks,
  } = useStudioShowTasksPageData({
    studioId,
    showId,
    showFromNavigation,
  });

  const {
    handleAssign,
    handleRunAction,
    handleSubmitActionWithContent,
    handleSaveDueDate,
    deleteSelectedTasks,
    processingTaskId,
    isAssigning,
    isDeleting,
    isUpdatingStatus,
    isUpdatingTask,
  } = useStudioShowTasksPageMutations({
    studioId,
    showId,
    onDeleteSuccess: handleDeleteMutationSuccess,
    onOpenTaskActionDraft: openTaskActionDraft,
    onClearTaskActionDraft: clearTaskActionDraft,
    onClearDueDateTask: clearDueDateTask,
  });

  const currentShow = useMemo(() => {
    return buildCurrentShowSelection(showId, showDetails?.name, taskList);
  }, [showId, showDetails?.name, taskList]);
  const showSubtitle = useMemo(() => buildShowSubtitle(showDetails), [showDetails]);
  const showMetaItems = useMemo(() => buildShowMetaItems(showDetails ?? null), [showDetails]);
  const handleDeleteSelected = useCallback(() => {
    deleteSelectedTasks(selectedUids);
  }, [deleteSelectedTasks, selectedUids]);
  const handleRefreshAll = useCallback(() => {
    void refreshAll();
  }, [refreshAll]);

  const columns = useMemo(
    () => getColumns(
      members,
      handleAssign,
      isAssigning,
      handleRunAction,
      isUpdatingStatus ? processingTaskId : null,
      openDueDateEditor,
    ),
    [members, handleAssign, isAssigning, handleRunAction, isUpdatingStatus, processingTaskId, openDueDateEditor],
  );

  return {
    headerProps: {
      studioId,
      isLoadingShow,
      showDetails,
      showSubtitle,
      isShowDetailsOpen,
      onToggleShowDetails: handleToggleShowDetails,
      showMetaItems,
    },
    tableProps: {
      data: taskList,
      columns,
      isLoading: isTableLoading,
      rowSelection,
      onRowSelectionChange: setRowSelection,
    },
    toolbarActionsProps: {
      selectedCount,
      isDeleting,
      isRefreshing,
      onRefreshAll: handleRefreshAll,
      onOpenGenerateDialog: openGenerateDialog,
      onOpenAssignDialog: openAssignDialog,
      onOpenDeleteDialog: openDeleteDialog,
    },
    dialogsProps: {
      studioId,
      isDeleteDialogOpen,
      onDeleteDialogOpenChange: setIsDeleteDialogOpen,
      onDeleteSelected: handleDeleteSelected,
      selectedCount,
      isDeleting,
      isGenerateDialogOpen,
      onGenerateDialogOpenChange: setIsGenerateDialogOpen,
      currentShow,
      onTasksChanged: refetchShowTasks,
      actionDraft,
      isUpdatingStatus,
      onActionSheetOpenChange: handleTaskActionSheetOpenChange,
      onSubmitActionWithContent: handleSubmitActionWithContent,
      dueDateTask,
      onDueDateDialogOpenChange: handleDueDateDialogOpenChange,
      onSaveDueDate: handleSaveDueDate,
      isUpdatingTask,
      isAssignDialogOpen,
      onAssignDialogOpenChange: setIsAssignDialogOpen,
    },
  };
}
