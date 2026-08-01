import { memo, useState } from 'react';

import { AsyncCombobox, Label } from '@eridu/ui';

import { useStudioMembers } from '@/features/studio-members/api/members';

type ShowIssueOwnerFieldProps = {
  studioId: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
};

/**
 * Shared owner picker for the create/edit issue dialogs. Extracted per
 * `frontend-ui-components` (2+ AsyncCombobox usages across a feature ->
 * memoized field component). Backed by `/studios/:studioId/members`
 * (ADMIN/MANAGER only — matches who can assign an owner).
 */
export const ShowIssueOwnerField = memo(({
  studioId,
  value,
  onChange,
  disabled,
}: ShowIssueOwnerFieldProps) => {
  const [search, setSearch] = useState('');
  const { data, isLoading } = useStudioMembers(studioId, { search: search || undefined, limit: 20 });

  const options = (data?.data ?? []).map((member) => ({
    value: member.user_id,
    label: `${member.user_name} (${member.user_email})`,
  }));

  return (
    <div className="space-y-1.5">
      <Label htmlFor="show-issue-owner">Owner</Label>
      <AsyncCombobox
        value={value}
        onChange={onChange}
        onSearch={setSearch}
        options={options}
        isLoading={isLoading}
        placeholder="Unassigned — search studio members..."
        disabled={disabled}
      />
    </div>
  );
});
