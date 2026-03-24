import { z } from 'zod';

export const taskReportBuilderSearchSchema = z.object({
  definition_id: z.string().optional().catch(undefined),
});

export function parseTaskReportBuilderSearch(search: unknown) {
  return taskReportBuilderSearchSchema.parse(search ?? {});
}
