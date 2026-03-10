import type { ColumnDef } from '@tanstack/react-table';
import { HelpCircle, RefreshCw, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { z } from 'zod';

import { STUDIO_ROLE } from '@eridu/api-types/memberships';
import {
  adaptColumnFiltersChange,
  adaptPaginationChange,
  AsyncCombobox,
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  DataTable,
  DataTablePagination,
  DataTableToolbar,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  useTableUrlState,
} from '@eridu/ui';

import { AdminFormDialog } from '@/features/admin/components';
import { useCreateStudioMembership } from '@/features/memberships/api/create-studio-membership';
import { useDeleteStudioMembership } from '@/features/memberships/api/delete-studio-membership';
import { useMembershipUserCatalog } from '@/features/memberships/api/get-membership-user-catalog';
import type { Membership } from '@/features/memberships/api/get-memberships';
import { useStudioMembershipsQuery } from '@/features/memberships/api/get-studio-memberships';
import { useUpdateStudioMembershipHelper } from '@/features/memberships/api/update-studio-membership-helper';
import { useUpdateStudioMembershipRole } from '@/features/memberships/api/update-studio-membership-role';
import { isTaskHelperEligibleMember } from '@/features/memberships/lib/task-helper-eligibility';
import { useStudioAccess } from '@/lib/hooks/use-studio-access';
import { useUserProfile } from '@/lib/hooks/use-user';

const ROLE_LABEL: Record<string, string> = {
  admin: 'Admin',
  manager: 'Manager',
  member: 'Member',
  talent_manager: 'Talent Manager',
  designer: 'Designer',
  moderation_manager: 'Moderation Manager',
};

type StudioHelperRosterManagerProps = {
  studioId: string;
  enabled?: boolean;
};

function roleLabel(role: string): string {
  return ROLE_LABEL[role] ?? role;
}

const roleValues = Object.values(STUDIO_ROLE) as [string, ...string[]];
const inviteMemberSchema = z.object({
  user_id: z.string().min(1, 'User ID is required'),
  role: z.enum(roleValues),
});

export function StudioHelperRosterManager({
  studioId,
  enabled = true,
}: StudioHelperRosterManagerProps) {
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteSearch, setInviteSearch] = useState('');
  const { role: currentRole } = useStudioAccess(studioId);
  const { data: profile } = useUserProfile();
  const canChangeRole = currentRole === STUDIO_ROLE.ADMIN;
  const {
    pagination,
    onPaginationChange,
    setPageCount,
    columnFilters,
    onColumnFiltersChange,
  } = useTableUrlState({
    from: '/studios/$studioId/members',
    searchColumnId: 'member_name',
    paramNames: {
      search: 'search',
    },
  });

  const searchTerm = (columnFilters.find((filter) => filter.id === 'member_name')?.value as string | undefined) || undefined;

  const query = useStudioMembershipsQuery(
    studioId,
    {
      page: pagination.pageIndex + 1,
      limit: pagination.pageSize,
      name: searchTerm,
    },
    { enabled },
  );

  const { mutateAsync: updateHelper, isPending: isHelperPending } = useUpdateStudioMembershipHelper();
  const createMembership = useCreateStudioMembership(studioId);
  const updateRoleMutation = useUpdateStudioMembershipRole(studioId);
  const deleteMembershipMutation = useDeleteStudioMembership(studioId);
  const userCatalogQuery = useMembershipUserCatalog(studioId, inviteSearch, { enabled: isInviteOpen });

  const memberships = useMemo(() => query.data?.data ?? [], [query.data?.data]);
  const inviteUserOptions = useMemo(
    () => (userCatalogQuery.data ?? []).map((user) => ({
      label: `${user.name} (${user.email})`,
      value: user.id,
    })),
    [userCatalogQuery.data],
  );
  const paginationMeta = query.data?.meta;
  const totalFilteredMembers = paginationMeta?.total ?? 0;
  const isSearching = Boolean(searchTerm?.trim());
  const rosterEmptyMessage = isSearching
    ? `No members found for "${searchTerm}".`
    : 'No studio members found.';

  const tablePagination = paginationMeta
    ? {
        pageIndex: paginationMeta.page - 1,
        pageSize: paginationMeta.limit,
        total: paginationMeta.total,
        pageCount: paginationMeta.totalPages,
      }
    : {
        pageIndex: pagination.pageIndex,
        pageSize: pagination.pageSize,
        total: 0,
        pageCount: 0,
      };

  useEffect(() => {
    if (paginationMeta?.totalPages !== undefined) {
      setPageCount(paginationMeta.totalPages);
    }
  }, [paginationMeta?.totalPages, setPageCount]);

  const columns: ColumnDef<Membership>[] = [
    {
      id: 'member_name',
      accessorFn: (row) => row.user.name,
      header: 'Member',
      cell: ({ row }) => (
        <div className="min-w-0">
          <div className="truncate font-medium">{row.original.user.name}</div>
          <div className="truncate text-xs text-muted-foreground">{row.original.user.email}</div>
        </div>
      ),
    },
    {
      id: 'role',
      accessorFn: (row) => roleLabel(row.role),
      header: 'Role',
      cell: ({ row }) => {
        const membership = row.original;
        const isSelf = (membership.user.ext_id && profile?.ext_id && membership.user.ext_id === profile.ext_id)
          || membership.user.email === profile?.email;

        if (!canChangeRole || isSelf) {
          return <Badge variant="outline">{roleLabel(membership.role)}</Badge>;
        }

        return (
          <Select
            value={membership.role}
            onValueChange={async (nextRole) => {
              if (nextRole === membership.role) {
                return;
              }
              try {
                await updateRoleMutation.mutateAsync({
                  membershipId: membership.id,
                  role: nextRole as (typeof STUDIO_ROLE)[keyof typeof STUDIO_ROLE],
                });
                toast.success('Role updated');
              } catch (error) {
                const message = error instanceof Error ? error.message : 'Failed to update role';
                toast.error(message);
              }
            }}
            disabled={updateRoleMutation.isPending}
          >
            <SelectTrigger className="h-8 w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {roleValues.map((role) => (
                <SelectItem key={role} value={role}>
                  {roleLabel(role)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      },
      size: 220,
    },
    {
      id: 'eligibility',
      accessorFn: (row) => (isTaskHelperEligibleMember(row) ? 'eligible' : 'not_eligible'),
      header: () => (
        <div className="flex items-center gap-1.5">
          <span>Helper Eligibility</span>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-sm">
                <p>
                  Helpers are members eligible for task assignments.
                  Admins and Managers are always eligible.
                  Other roles (like Talent Managers) must be explicitly enabled here.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      ),
      cell: ({ row }) => {
        const membership = row.original;
        const isRoleDefault = membership.role === 'admin' || membership.role === 'manager';

        if (isRoleDefault) {
          return <Badge variant="secondary">Always On (by role)</Badge>;
        }

        return (
          <Button
            type="button"
            variant={membership.is_helper ? 'outline' : 'default'}
            size="sm"
            disabled={isHelperPending || query.isFetching}
            onClick={async () => {
              try {
                await updateHelper({
                  studioId,
                  membershipId: membership.id,
                  isHelper: !membership.is_helper,
                });
                toast.success(!membership.is_helper ? 'Helper enabled' : 'Helper disabled');
              } catch (error) {
                const message = error instanceof Error ? error.message : 'Failed to update helper eligibility';
                toast.error(message);
              }
            }}
          >
            {membership.is_helper ? 'Enabled' : 'Disabled'}
          </Button>
        );
      },
      size: 220,
    },
    {
      id: 'action',
      header: 'Action',
      cell: ({ row }) => {
        const membership = row.original;
        const isSelf = (membership.user.ext_id && profile?.ext_id && membership.user.ext_id === profile.ext_id)
          || membership.user.email === profile?.email;

        return (
          <div className="flex w-full justify-end">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-red-600 hover:text-red-700"
              disabled={isSelf || deleteMembershipMutation.isPending}
              onClick={async () => {
                try {
                  await deleteMembershipMutation.mutateAsync(membership.id);
                  toast.success('Membership removed');
                } catch (error) {
                  const message = error instanceof Error ? error.message : 'Failed to remove membership';
                  toast.error(message);
                }
              }}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Remove
            </Button>
          </div>
        );
      },
      size: 140,
    },
  ];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Add Member to Studio</CardTitle>
          <CardDescription>
            Invite existing system users into this studio membership roster.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-between gap-3">
          <div className="text-sm text-muted-foreground">
            {totalFilteredMembers}
            {' '}
            members in this studio
          </div>
          <Button type="button" onClick={() => setIsInviteOpen(true)}>
            Invite Member
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Studio Member Roster</CardTitle>
          <CardDescription>
            Manage member roles, helper eligibility, and membership status for this studio.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            data={memberships}
            columns={columns}
            isLoading={query.isLoading}
            isFetching={query.isFetching}
            emptyMessage={rosterEmptyMessage}
            manualPagination
            manualFiltering
            pageCount={tablePagination.pageCount}
            paginationState={{
              pageIndex: pagination.pageIndex,
              pageSize: pagination.pageSize,
            }}
            onPaginationChange={adaptPaginationChange(tablePagination, onPaginationChange)}
            columnFilters={columnFilters}
            onColumnFiltersChange={adaptColumnFiltersChange(columnFilters, onColumnFiltersChange)}
            renderToolbar={(table) => (
              <DataTableToolbar
                table={table}
                searchColumn="member_name"
                searchPlaceholder="Search members by name or email..."
                searchableColumns={[
                  {
                    id: 'member_name',
                    title: 'Member',
                    type: 'text',
                  },
                ]}
              >
                <Button
                  variant="outline"
                  size="icon"
                  className="h-9 w-9"
                  onClick={() => void query.refetch()}
                  disabled={query.isFetching}
                  aria-label="Refresh member roster"
                >
                  <RefreshCw className={`h-4 w-4 ${query.isFetching ? 'animate-spin' : ''}`} />
                </Button>
              </DataTableToolbar>
            )}
            renderFooter={() => (
              <DataTablePagination
                pagination={{
                  pageIndex: pagination.pageIndex,
                  pageSize: pagination.pageSize,
                  total: tablePagination.total,
                  pageCount: tablePagination.pageCount,
                }}
                onPaginationChange={onPaginationChange}
              />
            )}
          />
        </CardContent>
      </Card>

      <AdminFormDialog
        open={isInviteOpen}
        onOpenChange={(open) => {
          setIsInviteOpen(open);
          if (!open) {
            setInviteSearch('');
          }
        }}
        title="Invite Member to Studio"
        description="Add an existing system user to this studio with a role."
        schema={inviteMemberSchema}
        onSubmit={async (data) => {
          try {
            await createMembership.mutateAsync({
              user_id: data.user_id,
              role: data.role as (typeof STUDIO_ROLE)[keyof typeof STUDIO_ROLE],
            });
            toast.success('Member invited to studio');
          } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to invite member';
            toast.error(message);
            throw error;
          }
        }}
        isLoading={createMembership.isPending}
        fields={[
          {
            name: 'user_id',
            label: 'User',
            render: (field) => (
              <AsyncCombobox
                value={field.value ?? ''}
                onChange={field.onChange}
                onSearch={setInviteSearch}
                options={inviteUserOptions}
                isLoading={userCatalogQuery.isLoading || userCatalogQuery.isFetching}
                placeholder="Search users by name..."
                emptyMessage="No matching users found."
                disabled={createMembership.isPending}
              />
            ),
          },
          {
            name: 'role',
            label: 'Role',
            render: (field) => (
              <Select
                value={field.value ?? ''}
                onValueChange={field.onChange}
                disabled={createMembership.isPending}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  {roleValues.map((role) => (
                    <SelectItem key={role} value={role}>
                      {roleLabel(role)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ),
          },
        ]}
      />
    </div>
  );
}
