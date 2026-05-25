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

import { PageContainer } from '@/components/layouts/page-container';
import { PageLayout } from '@/components/layouts/page-layout';
import { checkForPwaUpdates, recoverPwaShell } from '@/lib/pwa';

export const Route = createFileRoute('/settings')({
  component: SettingsPage,
});

function SettingsPage() {
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
    <PageContainer>
      <PageLayout
        title="Settings"
        description="Application preferences and maintenance tools."
      >
        <div className="space-y-6">
          <section>
            <h2 className="text-lg font-semibold tracking-tight text-slate-200">App Shell &amp; Service Worker</h2>
            <p className="text-sm text-slate-400 mb-4">
              Manage the PWA service worker lifecycle. Use these tools when the app appears outdated or stuck after a deployment.
            </p>

            <div className="grid gap-4 sm:grid-cols-2">
              <Card className="bg-slate-900/30 border-slate-800 hover:border-slate-700/60 transition-all duration-300 shadow-xl">
                <CardHeader>
                  <CardTitle className="text-base text-slate-300">Check for Updates</CardTitle>
                  <CardDescription className="text-slate-400">
                    Trigger an immediate service worker update check. If an update is already waiting, this also applies it.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-slate-800 bg-slate-900/60 hover:bg-slate-800 text-slate-300"
                    onClick={() => { void handleCheckForUpdates(); }}
                    disabled={isCheckingUpdates}
                  >
                    <RefreshCw className={`mr-2 h-4 w-4 ${isCheckingUpdates ? 'animate-spin' : ''}`} />
                    {isCheckingUpdates ? 'Checking...' : 'Check for updates'}
                  </Button>
                </CardContent>
              </Card>

              <Card className="bg-slate-900/30 border-rose-950/40 hover:border-rose-900/40 transition-all duration-300 shadow-xl">
                <CardHeader>
                  <CardTitle className="text-base text-slate-300 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-rose-400" />
                    Reset App Shell
                  </CardTitle>
                  <CardDescription className="text-slate-400">
                    Unregisters all service workers, clears cache, clears query cache database, and reloads. Use only when the app is stuck after a deployment.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="bg-rose-950/80 hover:bg-rose-900 border border-rose-800/50 text-rose-200"
                    onClick={() => { void handleRecovery(); }}
                    disabled={isRecovering}
                  >
                    <RotateCcw className={`mr-2 h-4 w-4 ${isRecovering ? 'animate-spin' : ''}`} />
                    {isRecovering ? 'Resetting...' : 'Reset app shell'}
                  </Button>
                </CardContent>
              </Card>
            </div>
          </section>
        </div>
      </PageLayout>
    </PageContainer>
  );
}
