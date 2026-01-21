import { useState } from 'react';

import {
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

import { authClient } from '@/frontend/features/auth/api/auth-client';
import type { ExtendedUser } from '@/lib/types';
import { hasRole } from '@/lib/types';

type AdminUserManagementProps = {
  currentUser: ExtendedUser;
};

export function AdminUserManagement({ currentUser }: AdminUserManagementProps) {
  const [activeTab, setActiveTab] = useState<'list' | 'password' | 'create'>('list');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // List Users State
  const [users, setUsers] = useState<ExtendedUser[]>([]);
  const [total, setTotal] = useState(0);
  const [pageIndex, setPageIndex] = useState(0); // 0-based indexing
  const [pageSize, setPageSize] = useState(10);

  // Password Management State
  const [selectedUserId, setSelectedUserId] = useState('');
  const [newPassword, setNewPassword] = useState('');

  // Create User State
  const [createEmail, setCreateEmail] = useState('');
  const [createName, setCreateName] = useState('');
  const [createPassword, setCreatePassword] = useState('');
  const [createRole, setCreateRole] = useState('user');

  // Check if current user is admin
  if (!hasRole(currentUser, 'admin')) {
    return null;
  }

  const loadUsers = async (index: number = 0, size: number = pageSize) => {
    setLoading(true);
    setError(null);
    try {
      const offset = index * size; // 0-based indexing
      const result = await authClient.admin.listUsers({
        query: { limit: size, offset },
      });

      if (result.error) {
        setError(result.error.message || 'Failed to load users');
      } else if (result.data) {
        setUsers(result.data.users as ExtendedUser[]);
        setTotal(result.data.total);
        setPageIndex(index);
      }
    } catch (err) {
      setError('An unexpected error occurred');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const { error: passwordError } = await authClient.admin.setUserPassword({
        userId: selectedUserId,
        newPassword,
      });

      if (passwordError) {
        setError(passwordError.message || 'Failed to set password');
      } else {
        setSuccess('Password updated successfully');
        setSelectedUserId('');
        setNewPassword('');
      }
    } catch (err) {
      setError('An unexpected error occurred');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleRole = async (userId: string, currentRole: string) => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const roles = currentRole.split(',').map((r) => r.trim());
      const hasAdmin = roles.includes('admin');

      // Toggle admin role
      const newRoles = hasAdmin
        ? roles.filter((r) => r !== 'admin')
        : [...roles, 'admin'];

      const { error: roleError } = await authClient.admin.setRole({
        userId,
        role: newRoles.join(',') as 'user' | 'admin' | ('user' | 'admin')[],
      });

      if (roleError) {
        setError(roleError.message || 'Failed to update role');
      } else {
        setSuccess(`User role updated successfully`);
        // Reload users list
        await loadUsers(pageIndex);
      }
    } catch (err) {
      setError('An unexpected error occurred');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const { error: createError } = await authClient.admin.createUser({
        email: createEmail,
        name: createName,
        password: createPassword,
        role: createRole as 'user' | 'admin' | ('user' | 'admin')[] | undefined,
      });

      if (createError) {
        setError(createError.message || 'Failed to create user');
      } else {
        setSuccess('User created successfully');
        setCreateEmail('');
        setCreateName('');
        setCreatePassword('');
        setCreateRole('user');
        // Reload users list
        await loadUsers(0); // Load first page (0-based)
      }
    } catch (err) {
      setError('An unexpected error occurred');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Load users on first render
  if (activeTab === 'list' && users.length === 0 && !loading) {
    loadUsers(0); // Load first page (0-based)
  }

  const pageCount = Math.ceil(total / pageSize);

  return (
    <div className="mt-8 overflow-hidden rounded-lg bg-white shadow">
      <div className="border-b border-gray-200 bg-gray-50 px-6 py-4">
        <h2 className="text-xl font-semibold text-gray-900">Admin Tools</h2>
        <p className="mt-1 text-sm text-gray-600">
          Manage users, passwords, and roles
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8 px-6" aria-label="Tabs">
          <button
            type="button"
            onClick={() => setActiveTab('list')}
            className={`whitespace-nowrap border-b-2 px-1 py-4 text-sm font-medium ${activeTab === 'list'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
            }`}
          >
            User List
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('password')}
            className={`whitespace-nowrap border-b-2 px-1 py-4 text-sm font-medium ${activeTab === 'password'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
            }`}
          >
            Set Password
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('create')}
            className={`whitespace-nowrap border-b-2 px-1 py-4 text-sm font-medium ${activeTab === 'create'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
            }`}
          >
            Create User
          </button>
        </nav>
      </div>

      <div className="px-6 py-6">
        {/* Error/Success Messages */}
        {error && (
          <div className="mb-4 rounded-md bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 rounded-md bg-green-50 p-4 text-sm text-green-700">
            {success}
          </div>
        )}

        {/* User List Tab */}
        {activeTab === 'list' && (
          <div>
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm text-gray-600">
                Total users:
                {' '}
                {total}
              </p>
              <Button
                onClick={() => loadUsers(pageIndex)}
                variant="outline"
                size="sm"
                disabled={loading}
              >
                Refresh
              </Button>
            </div>

            {loading
              ? (
                  <div className="text-center py-8">
                    <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent" />
                  </div>
                )
              : (
                  <>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Role</TableHead>
                          <TableHead>Verified</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {users.map((user) => (
                          <TableRow key={user.id}>
                            <TableCell className="font-medium">
                              {user.name}
                            </TableCell>
                            <TableCell>{user.email}</TableCell>
                            <TableCell>
                              <span
                                className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${hasRole(user, 'admin')
                                  ? 'bg-purple-100 text-purple-800'
                                  : 'bg-gray-100 text-gray-800'
                                }`}
                              >
                                {user.role}
                              </span>
                            </TableCell>
                            <TableCell>
                              {user.emailVerified
                                ? (
                                    <span className="text-green-600">✓</span>
                                  )
                                : (
                                    <span className="text-gray-400">✗</span>
                                  )}
                            </TableCell>
                            <TableCell>
                              <Button
                                onClick={() => handleToggleRole(user.id, user.role)}
                                variant="outline"
                                size="sm"
                                disabled={user.id === currentUser.id}
                              >
                                {hasRole(user, 'admin')
                                  ? 'Remove Admin'
                                  : 'Make Admin'}
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>

                    {/* Pagination */}
                    {pageCount > 0 && (
                      <div className="mt-4 border-t border-gray-200 pt-4">
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
                            loadUsers(newIndex, newSize);
                          }}
                        />
                      </div>
                    )}
                  </>
                )}
          </div>
        )}

        {/* Set Password Tab */}
        {activeTab === 'password' && (
          <form onSubmit={handleSetPassword} className="max-w-md space-y-4">
            <div>
              <label htmlFor="userId" className="block text-sm font-medium text-gray-700">
                User ID
              </label>
              <Input
                id="userId"
                type="text"
                required
                className="mt-1"
                placeholder="Enter user ID"
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
              />
              <p className="mt-1 text-xs text-gray-500">
                You can find the user ID in the user list
              </p>
            </div>
            <div>
              <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700">
                New Password
              </label>
              <Input
                id="newPassword"
                type="password"
                required
                className="mt-1"
                placeholder="Enter new password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
            <Button type="submit" disabled={loading}>
              {loading ? 'Setting Password...' : 'Set Password'}
            </Button>
          </form>
        )}

        {/* Create User Tab */}
        {activeTab === 'create' && (
          <form onSubmit={handleCreateUser} className="max-w-md space-y-4">
            <div>
              <label htmlFor="createEmail" className="block text-sm font-medium text-gray-700">
                Email
              </label>
              <Input
                id="createEmail"
                type="email"
                required
                className="mt-1"
                placeholder="user@example.com"
                value={createEmail}
                onChange={(e) => setCreateEmail(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="createName" className="block text-sm font-medium text-gray-700">
                Name
              </label>
              <Input
                id="createName"
                type="text"
                required
                className="mt-1"
                placeholder="John Doe"
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="createPassword" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <Input
                id="createPassword"
                type="password"
                required
                className="mt-1"
                placeholder="••••••••"
                value={createPassword}
                onChange={(e) => setCreatePassword(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="createRole" className="block text-sm font-medium text-gray-700">
                Role
              </label>
              <select
                id="createRole"
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                value={createRole}
                onChange={(e) => setCreateRole(e.target.value)}
              >
                <option value="user">User</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <Button type="submit" disabled={loading}>
              {loading ? 'Creating User...' : 'Create User'}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
