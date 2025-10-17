import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';

export function TeamsPage() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Teams</h1>
          <p className="mt-2 text-gray-600">
            Manage your teams and members
          </p>
        </div>
        <Button>Create Team</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Development Team</CardTitle>
            <CardDescription>5 members</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">
              Core development team for the project.
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
