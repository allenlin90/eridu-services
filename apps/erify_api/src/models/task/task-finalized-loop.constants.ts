import type { TaskStatus } from '@prisma/client';

/**
 * Task statuses eligible for loop-metric / loop-mechanic aggregation: a task
 * is authoritative for "what actually ran" once it's finalized. Shared by
 * `StudioPerformanceRepository` (PR 22.1) and `ClientMechanicRepository`
 * (PR 20.6/20.7) so "latest finalized task with a loop schema wins" stays one
 * selection rule, not two independently-maintained copies.
 */
export const FINALIZED_LOOP_TASK_STATUSES = ['COMPLETED', 'CLOSED'] as const satisfies readonly TaskStatus[];
