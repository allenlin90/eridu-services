import { useMemo } from 'react';

import type { CompensationLineItemApiResponse } from '@eridu/api-types/compensation-line-items';
import {
  createAdminCompensationLineItemInputSchema,
  updateCompensationLineItemInputSchema,
} from '@eridu/api-types/compensation-line-items';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@eridu/ui';

import { AdminFormDialog } from '@/features/admin/components/admin-form-dialog';

type CompensationLineItemFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lineItem?: CompensationLineItemApiResponse | null;
  onSubmit: (data: any) => Promise<void>;
  isLoading?: boolean;
};

export function CompensationLineItemFormDialog({
  open,
  onOpenChange,
  lineItem,
  onSubmit,
  isLoading,
}: CompensationLineItemFormDialogProps) {
  const isEditing = !!lineItem;

  const schema = isEditing
    ? updateCompensationLineItemInputSchema
    : createAdminCompensationLineItemInputSchema;

  const defaultValues = useMemo(() => {
    if (isEditing && lineItem) {
      return {
        amount: lineItem.amount,
        item_type: lineItem.item_type,
        reason: lineItem.reason,
      };
    }
    return {
      studio_id: '',
      target_type: 'SHOW',
      target_uid: '',
      amount: '',
      item_type: 'BONUS',
      reason: '',
    };
  }, [isEditing, lineItem]);

  return (
    <AdminFormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={isEditing ? 'Edit Compensation Line Item' : 'Create Compensation Line Item'}
      schema={schema as any}
      defaultValues={defaultValues as any}
      onSubmit={onSubmit}
      isLoading={isLoading}
      fields={[
        ...(!isEditing
          ? [
              {
                name: 'studio_id',
                label: 'Studio ID',
                placeholder: 'stu_...',
              },
              {
                kind: 'render' as const,
                id: 'target_type',
                label: 'Target Type',
                render: (form: any) => (
                  <Select
                    disabled={isLoading}
                    onValueChange={(value) => form.setValue('target_type', value)}
                    defaultValue={form.watch('target_type')}
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
                label: 'Target UID',
                placeholder: 'Target identifier...',
              },
            ]
          : []),
        {
          name: 'amount',
          label: 'Amount',
          placeholder: '0.00',
        },
        {
          kind: 'render' as const,
          id: 'item_type',
          label: 'Item Type',
          render: (form: any) => (
            <Select
              disabled={isLoading}
              onValueChange={(value) => form.setValue('item_type', value)}
              defaultValue={form.watch('item_type')}
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
