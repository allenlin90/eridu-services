import type { z } from 'zod';

import type { CompensationLineItemApiResponse } from '@eridu/api-types/compensation-line-items';
import {
  createAdminCompensationLineItemInputSchema,
  updateCompensationLineItemInputSchema,
} from '@eridu/api-types/compensation-line-items';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@eridu/ui';

import { AdminFormDialog } from '@/features/admin/components/admin-form-dialog';

export type CreateCompensationLineItemFormData = z.infer<typeof createAdminCompensationLineItemInputSchema>;
export type UpdateCompensationLineItemFormData = z.infer<typeof updateCompensationLineItemInputSchema>;

type CompensationLineItemCreateDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CreateCompensationLineItemFormData) => Promise<void>;
  isLoading?: boolean;
};

export function CompensationLineItemCreateDialog({
  open,
  onOpenChange,
  onSubmit,
  isLoading,
}: CompensationLineItemCreateDialogProps) {
  return (
    <AdminFormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Create Compensation Line Item"
      schema={createAdminCompensationLineItemInputSchema}
      defaultValues={{
        studio_id: '',
        target_type: 'SHOW',
        target_uid: '',
        amount: '',
        item_type: 'BONUS',
        reason: '',
      }}
      onSubmit={onSubmit}
      isLoading={isLoading}
      fields={[
        {
          name: 'studio_id',
          label: 'Studio ID',
          placeholder: 'stu_...',
        },
        {
          kind: 'render',
          id: 'target_type',
          label: 'Target Type',
          render: (form) => (
            <Select
              disabled={isLoading}
              onValueChange={(value) => form.setValue('target_type', value as CreateCompensationLineItemFormData['target_type'])}
              value={form.watch('target_type')}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select target type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="SHOW">Show</SelectItem>
                <SelectItem value="SHOW_CREATOR">Show Creator</SelectItem>
                <SelectItem value="STUDIO_SHIFT">Studio Shift</SelectItem>
                <SelectItem value="STUDIO_SHIFT_BLOCK">Studio Shift Block</SelectItem>
              </SelectContent>
            </Select>
          ),
        },
        {
          name: 'target_uid',
          label: 'Target ID',
          placeholder: 'Target identifier...',
        },
        {
          name: 'amount',
          label: 'Amount',
          placeholder: '0.00',
        },
        {
          kind: 'render',
          id: 'item_type',
          label: 'Item Type',
          render: (form) => (
            <Select
              disabled={isLoading}
              onValueChange={(value) => form.setValue('item_type', value as CreateCompensationLineItemFormData['item_type'])}
              value={form.watch('item_type')}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select item type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="BONUS">Bonus</SelectItem>
                <SelectItem value="ALLOWANCE">Allowance</SelectItem>
                <SelectItem value="OVERTIME">Overtime</SelectItem>
                <SelectItem value="DEDUCTION">Deduction</SelectItem>
                <SelectItem value="OTHER">Other</SelectItem>
              </SelectContent>
            </Select>
          ),
        },
        {
          name: 'reason',
          label: 'Reason',
          type: 'textarea',
          placeholder: 'Reason for the compensation...',
        },
      ]}
    />
  );
}

type CompensationLineItemUpdateDialogProps = {
  lineItem: CompensationLineItemApiResponse | null;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: UpdateCompensationLineItemFormData) => Promise<void>;
  isLoading?: boolean;
};

export function CompensationLineItemUpdateDialog({
  lineItem,
  onOpenChange,
  onSubmit,
  isLoading,
}: CompensationLineItemUpdateDialogProps) {
  return (
    <AdminFormDialog
      open={!!lineItem}
      onOpenChange={onOpenChange}
      title="Edit Compensation Line Item"
      schema={updateCompensationLineItemInputSchema}
      defaultValues={
        lineItem
          ? {
              amount: lineItem.amount,
              item_type: lineItem.item_type,
              reason: lineItem.reason,
            }
          : undefined
      }
      onSubmit={onSubmit}
      isLoading={isLoading}
      fields={[
        {
          name: 'amount',
          label: 'Amount',
          placeholder: '0.00',
        },
        {
          kind: 'render',
          id: 'item_type',
          label: 'Item Type',
          render: (form) => (
            <Select
              disabled={isLoading}
              onValueChange={(value) => form.setValue('item_type', value as UpdateCompensationLineItemFormData['item_type'])}
              value={form.watch('item_type')}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select item type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="BONUS">Bonus</SelectItem>
                <SelectItem value="ALLOWANCE">Allowance</SelectItem>
                <SelectItem value="OVERTIME">Overtime</SelectItem>
                <SelectItem value="DEDUCTION">Deduction</SelectItem>
                <SelectItem value="OTHER">Other</SelectItem>
              </SelectContent>
            </Select>
          ),
        },
        {
          name: 'reason',
          label: 'Reason',
          type: 'textarea',
          placeholder: 'Reason for the compensation...',
        },
      ]}
    />
  );
}
