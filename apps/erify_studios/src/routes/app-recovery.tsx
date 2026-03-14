import { createFileRoute } from '@tanstack/react-router';
import { AlertTriangle, RefreshCw, RotateCcw } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@eridu/ui';

import { PageLayout } from '@/components/layouts/page-layout';
import { checkForPwaUpdates, recoverPwaShell } from '@/lib/pwa';

export const Route = createFileRoute('/app-recovery')({
  component: AppRecoveryPage,
});

function AppRecoveryPage() {
  const [isCheckingUpdates, setIsCheckingUpdates] = useState(false);
  const [isRecovering, setIsRecovering] = useState(false);

  const handleCheckForUpdates = async () => {
    setIsCheckingUpdates(true);
    try {
      const didCheck = await checkForPwaUpdates();
      if (didCheck) {
        toast.success('Service worker update check completed');
      } else {
        toast.info('No active service worker registration was found');
      }
    } catch (error) {
      console.error('Manual PWA update check failed', error);
      toast.error('Failed to check for updates');
    } finally {
      setIsCheckingUpdates(false);
    }
  };

  const handleRecovery = async () => {
    setIsRecovering(true);
    toast.info('Resetting app shell and reloading...');
    try {
      await recoverPwaShell();
    } catch (error) {
      console.error('PWA recovery action failed', error);
      toast.error('Recovery failed. Please try again.');
      setIsRecovering(false);
    }
  };

  return (
    <PageLayout
      title="App Recovery"
      description="Service worker and app shell maintenance tools for update/recovery incidents."
    >
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Check For PWA Updates</CardTitle>
            <CardDescription>
              Trigger an immediate service-worker update check without waiting for the background interval.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => {
                void handleCheckForUpdates();
              }}
              disabled={isCheckingUpdates}
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${isCheckingUpdates ? 'animate-spin' : ''}`} />
              {isCheckingUpdates ? 'Checking...' : 'Check for updates'}
            </Button>
          </CardContent>
        </Card>

        <Card className="border-amber-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              Reset PWA Shell
            </CardTitle>
            <CardDescription>
              Use this only when the app shell appears stuck after deployment. This unregisters service workers,
              clears caches, and reloads the app.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="destructive"
              onClick={() => {
                void handleRecovery();
              }}
              disabled={isRecovering}
            >
              <RotateCcw className={`mr-2 h-4 w-4 ${isRecovering ? 'animate-spin' : ''}`} />
              {isRecovering ? 'Resetting...' : 'Reset app shell'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
}
