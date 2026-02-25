import { useMemo, useState } from 'react';

import type { AdminTaskTemplateDto } from '@eridu/api-types/task-management';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@eridu/ui';

import { useAdminTaskTemplateBindingsQuery } from '../api/get-admin-task-template-bindings';

type SystemTaskTemplateBindingsDialogProps = {
  template: AdminTaskTemplateDto | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function SystemTaskTemplateBindingsDialog({
  template,
  open,
  onOpenChange,
}: SystemTaskTemplateBindingsDialogProps) {
  const [page, setPage] = useState(1);
  const queryParams = useMemo(() => ({ page, limit: 10 }), [page]);

  const { data, isLoading, isFetching } = useAdminTaskTemplateBindingsQuery(
    template?.id ?? null,
    queryParams,
  );

  if (!template) {
    return null;
  }

  const items = data?.data ?? [];
  const meta = data?.meta;

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          setPage(1);
        }
        onOpenChange(nextOpen);
      }}
    >
      <DialogContent className="sm:max-w-[980px]">
        <DialogHeader>
          <DialogTitle>Template Bindings</DialogTitle>
          <DialogDescription>
            {template.name}
            {' '}
            (
            {template.id}
            )
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[60vh] overflow-auto border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Task</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Show</TableHead>
                <TableHead>Start</TableHead>
                <TableHead>Assignee</TableHead>
                <TableHead>Due Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading
                ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground">Loading bindings...</TableCell>
                    </TableRow>
                  )
                : items.length > 0
                  ? (
                      items.map((row) => (
                        <TableRow key={row.task.id}>
                          <TableCell className="font-mono text-xs">{row.task.id}</TableCell>
                          <TableCell>{row.task.status}</TableCell>
                          <TableCell>{row.show?.name ?? '-'}</TableCell>
                          <TableCell>{row.show?.start_time ?? '-'}</TableCell>
                          <TableCell>{row.assignee?.name ?? 'Unassigned'}</TableCell>
                          <TableCell>{row.task.due_date ?? '-'}</TableCell>
                        </TableRow>
                      ))
                    )
                  : (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground">
                          No bindings found.
                        </TableCell>
                      </TableRow>
                    )}
            </TableBody>
          </Table>
        </div>

        <DialogFooter className="flex items-center justify-between">
          <div className="text-xs text-muted-foreground">
            {meta
              ? `Page ${meta.page} of ${meta.totalPages} • ${meta.total} total`
              : null}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={!meta || meta.page <= 1 || isFetching}
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
            >
              Prev
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={!meta || meta.page >= meta.totalPages || isFetching}
              onClick={() => setPage((prev) => prev + 1)}
            >
              Next
            </Button>
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
