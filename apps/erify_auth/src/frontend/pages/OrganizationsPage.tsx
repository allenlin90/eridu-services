import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@eridu/ui/components/card';
import { Button } from '@eridu/ui/components/button';

export function OrganizationsPage() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Organizations</h1>
          <p className="mt-2 text-gray-600">
            Manage your organizations and teams
          </p>
        </div>
        <Button>Create Organization</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>My Organization</CardTitle>
            <CardDescription>Your primary organization</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">
              You are the owner of this organization.
            </p>
            <div className="mt-4 space-x-2">
              <Button size="sm">Manage</Button>
              <Button size="sm" variant="outline">Settings</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
