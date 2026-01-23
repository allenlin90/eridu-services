import { Edit2, RefreshCw, Search } from 'lucide-react';
import { useEffect, useState } from 'react';

import {
  Badge,
  Button,
  Input,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TablePagination,
  TableRow,
} from '@eridu/ui';

import { UserUpdateDialog } from '@/frontend/features/portal/components/user-update-dialog';
import { useAdminUsers } from '@/frontend/features/portal/hooks/use-admin-users';
import type { ExtendedUser } from '@/lib/types';
import { hasRole } from '@/lib/types';

export function AdminUserList() {
  const {
    users,
    total,
    loading,
    error: listError,
    pageIndex,
    pageSize,
    search,
    setSearch,
    setPageIndex,
    setPageSize,
    refresh,
    pageCount,
  } = useAdminUsers();

  const [editingUser, setEditingUser] = useState<ExtendedUser | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Clear success message after 5 seconds
  useEffect(() => {
    if (actionSuccess) {
      const timer = setTimeout(() => {
        setActionSuccess(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [actionSuccess]);

  return (
    <div className="space-y-4">
      {/* Search and Actions row */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search users..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex items-center gap-2 text-sm text-gray-500">
          <span className="hidden sm:inline">
            Total Users:
            {' '}
            <span className="font-semibold text-gray-900">{total}</span>
          </span>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => refresh()}
            disabled={loading}
            title="Refresh list"
            className="h-9 w-9"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {listError && (
        <div className="rounded-md bg-red-50 p-3 text-sm font-medium text-red-600">
          {listError}
        </div>
      )}

      {actionSuccess && (
        <div className="fixed bottom-4 right-4 z-50 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="rounded-lg bg-green-600 px-4 py-3 text-sm font-medium text-white shadow-lg flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-white animate-pulse" />
            {actionSuccess}
          </div>
        </div>
      )}

      <div className="rounded-md border border-gray-100 bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[40%]">User</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Email</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && users.length === 0
              ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-32 text-center">
                      <div className="flex flex-col items-center justify-center gap-2 text-gray-400">
                        <RefreshCw className="h-6 w-6 animate-spin" />
                        <span className="text-sm">Loading users...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              : users.length === 0
                ? (
                    <TableRow>
                      <TableCell colSpan={4} className="h-32 text-center text-gray-400">
                        No users found.
                      </TableCell>
                    </TableRow>
                  )
                : (
                    users.map((user) => (
                      <TableRow key={user.id} className="hover:bg-gray-50/50">
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium text-gray-900">{user.name || 'No name'}</span>
                            <span className="text-xs text-gray-500">{user.email}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={hasRole(user, 'admin') ? 'default' : 'secondary'}
                            className={`capitalize ${hasRole(user, 'admin') ? 'bg-indigo-600' : ''}`}
                          >
                            {user.role}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {user.emailVerified
                            ? (
                                <div className="flex items-center gap-1.5 text-green-700">
                                  <div className="h-1.5 w-1.5 rounded-full bg-green-600" />
                                  <span className="text-xs font-medium">Verified</span>
                                </div>
                              )
                            : (
                                <div className="flex items-center gap-1.5 text-red-700">
                                  <div className="h-1.5 w-1.5 rounded-full bg-red-500" />
                                  <span className="text-xs font-medium">Unverified</span>
                                </div>
                              )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setEditingUser(user)}
                            title="Edit User"
                            className="h-8 w-8 text-gray-400 hover:text-gray-900"
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
          </TableBody>
        </Table>
      </div>

      {pageCount > 1 && (
        <div className="px-1">
          <TablePagination
            pagination={{
              pageIndex,
              pageSize,
              total,
              pageCount,
            }}
            onPaginationChange={({ pageIndex: newIndex, pageSize: newSize }) => {
              setPageSize(newSize);
              setPageIndex(newIndex);
            }}
          />
        </div>
      )}

      <UserUpdateDialog
        user={editingUser}
        onOpenChange={(open) => !open && setEditingUser(null)}
        onSuccess={() => {
          setEditingUser(null);
          setActionSuccess('User updated successfully');
          refresh();
        }}
      />
    </div>
  );
}
