import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@eridu/ui/components/card';
import { Button } from '@eridu/ui/components/button';

export function SessionsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Active Sessions</h1>
        <p className="mt-2 text-gray-600">
          Manage your active login sessions across devices
        </p>
      </div>

      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Current Session</CardTitle>
            <CardDescription>This device - Chrome on macOS</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Location:</span>
                <span>San Francisco, CA, US</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">IP Address:</span>
                <span>192.168.1.100</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Last Active:</span>
                <span>Just now</span>
              </div>
            </div>
            <div className="mt-4">
              <Button size="sm" variant="outline" disabled>
                Current Session
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Mobile Session</CardTitle>
            <CardDescription>iPhone - Safari on iOS</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Location:</span>
                <span>San Francisco, CA, US</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">IP Address:</span>
                <span>192.168.1.101</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Last Active:</span>
                <span>2 hours ago</span>
              </div>
            </div>
            <div className="mt-4">
              <Button size="sm" variant="outline">
                Revoke Session
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
