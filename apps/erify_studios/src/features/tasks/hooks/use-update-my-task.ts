import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import type { TaskActionRequest, TaskDto, TaskWithRelationsDto } from '@eridu/api-types/task-management';

import { myTasksKeys } from '../api/get-my-tasks';
import { updateMyTask } from '../api/update-my-task';

import { showTasksKeys } from '@/features/studio-shows/api/get-show-tasks';
import type { PaginatedResponse } from '@/lib/api/admin';

export function useUpdateMyTask() {
  const queryClient = useQueryClient();

  return useMutation<TaskDto, Error, { taskId: string; data: TaskActionRequest; silent?: boolean }>({
    mutationFn: ({ taskId, data }) => updateMyTask(taskId, data),
    onSuccess: (updatedTask, variables) => {
      queryClient.setQueriesData<PaginatedResponse<TaskWithRelationsDto>>(
        { queryKey: myTasksKeys.lists() },
        (previousData) => {
          if (!previousData) {
            return previousData;
          }

          return {
            ...previousData,
            data: previousData.data.map((task) =>
              task.id === updatedTask.id
                ? {
                    ...task,
                    status: updatedTask.status,
                    version: updatedTask.version,
                    completed_at: updatedTask.completed_at,
                    content: updatedTask.content,
                    metadata: updatedTask.metadata,
                    due_date: updatedTask.due_date,
                    updated_at: updatedTask.updated_at,
                  }
                : task,
            ),
          };
        },
      );

      if (!variables.silent) {
        queryClient.invalidateQueries({ queryKey: myTasksKeys.all });
        // Depending on other views, we might also want to invalidate show tasks here
        queryClient.invalidateQueries({ queryKey: showTasksKeys.all });
        toast.success('Task updated successfully');
      }
    },
    
    },
  });
}
