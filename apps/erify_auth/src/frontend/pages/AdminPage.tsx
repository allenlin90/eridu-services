import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@eridu/ui/components/card';
import { Button } from '@eridu/ui/components/button';

export function AdminPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Admin Panel</h1>
        <p className="mt-2 text-muted-foreground">
          Manage users, organizations, and system settings
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>User Management</CardTitle>
            <CardDescription>Manage user accounts and permissions</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              View, edit, and manage user accounts across the system.
            </p>
            <Button className="w-full">Manage Users</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Organizations</CardTitle>
            <CardDescription>Manage organizations and memberships</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-4">
              Oversee all organizations and their settings.
            </p>
            <Button className="w-full">Manage Organizations</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>System Settings</CardTitle>
            <CardDescription>Configure system-wide settings</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-4">
              Configure authentication and system preferences.
            </p>
            <Button className="w-full">System Settings</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
