import { memo, useMemo, useState } from 'react';

import { AsyncCombobox, Label } from '@eridu/ui';

import { useStudioMembers } from '@/features/studio-members/api/members';

type ShowIssueOwnerFieldProps = {
  studioId: string;
  value: string;
  onChange: (value: string) => void;
  /**
   * The issue's original owner UID and display name, known up front from
   * the issue being edited. The member search only returns its first page
   * (`limit: 20`), so an already-assigned owner outside that page would
   * otherwise have no matching option and the combobox would render
   * "Select option..." instead of their name.
   *
   * `initialLabel` must only ever be shown for `initialOwnerId` — pairing it
   * with whatever `value` currently is, instead of checking it's still the
   * original UID, would misattribute it to a newly selected owner once
   * that new owner also falls outside the search page.
   */
  initialOwnerId?: string;
  initialLabel?: string;
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
  initialOwnerId,
  initialLabel,
  disabled,
}: ShowIssueOwnerFieldProps) => {
  const [search, setSearch] = useState('');
  const { data, isLoading } = useStudioMembers(studioId, { search: search || undefined, limit: 20 });

  const options = useMemo(() => {
    const fromSearch = (data?.data ?? []).map((member) => ({
      value: member.user_id,
      label: `${member.user_name} (${member.user_email})`,
    }));
    // Only reuse the cached label when the selection is still the original
    // owner — once the user picks someone else, that new UID must resolve
    // from real search results or show no label, never the old owner's name.
    if (
      value
      && initialOwnerId
      && initialLabel
      && value === initialOwnerId
      && !fromSearch.some((option) => option.value === value)
    ) {
      return [{ value: initialOwnerId, label: initialLabel }, ...fromSearch];
    }
    return fromSearch;
  }, [data, value, initialOwnerId, initialLabel]);

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
