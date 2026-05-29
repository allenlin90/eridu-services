import { LogOut, RefreshCw, ShieldAlert, UserX } from 'lucide-react';
import { type ReactNode, useState } from 'react';

import { Button, Spinner } from '@eridu/ui';

import { authClient } from '@/lib/auth';
import * as m from '@/paraglide/messages.js';

type GuardProps = {
  userName?: string;
  userEmail?: string;
  avatarUrl?: string;
  onRecheck: () => Promise<void>;
};

function useGuardActions(onRecheck: () => Promise<void>) {
  const [isRechecking, setIsRechecking] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleRecheck = async () => {
    setIsRechecking(true);
    try {
      await onRecheck();
    } finally {
      setIsRechecking(false);
    }
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      const { clearAllCaches } = await import('@/lib/api');
      await clearAllCaches();
      await authClient.client.signOut();
      authClient.redirectToLogin();
    } catch (error) {
      console.error('Logout failed:', error);
      setIsLoggingOut(false);
    }
  };

  return { isRechecking, isLoggingOut, handleRecheck, handleLogout };
}

type GuardScreenProps = {
  icon: ReactNode;
  title: string;
  description: string;
  recheckLabel: string;
  showUserCard?: boolean;
} & Pick<GuardProps, 'userName' | 'userEmail' | 'avatarUrl' | 'onRecheck'>;

function GuardScreen({
  icon,
  title,
  description,
  recheckLabel,
  showUserCard = true,
  userName,
  userEmail,
  avatarUrl,
  onRecheck,
}: GuardScreenProps) {
  const { isRechecking, isLoggingOut, handleRecheck, handleLogout } = useGuardActions(onRecheck);
  const busy = isRechecking || isLoggingOut;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="w-full max-w-md rounded-2xl border bg-card p-8 text-center shadow-lg">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-muted text-muted-foreground">
          {icon}
        </div>

        <h1 className="mb-2 text-2xl font-bold tracking-tight text-foreground">{title}</h1>
        <p className="mb-6 px-2 text-sm leading-relaxed text-muted-foreground">{description}</p>

        {showUserCard && (userName || userEmail)
          ? (
              <div className="mb-8 flex items-center gap-3 rounded-xl border bg-muted/40 p-4 text-left">
                <img
                  src={avatarUrl || '/avatars/default.jpg'}
                  alt={userName || 'User'}
                  className="h-10 w-10 rounded-full border object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/avatars/default.jpg';
                  }}
                />
                <div className="overflow-hidden">
                  <p className="truncate text-sm font-medium text-foreground">{userName}</p>
                  <p className="truncate text-xs text-muted-foreground">{userEmail}</p>
                </div>
              </div>
            )
          : null}

        <div className="flex flex-col gap-3">
          <Button onClick={handleRecheck} disabled={busy}>
            {isRechecking
              ? <Spinner className="h-4 w-4 border-current border-t-transparent" />
              : <RefreshCw className="h-4 w-4" />}
            {recheckLabel}
          </Button>
          <Button variant="outline" onClick={handleLogout} disabled={busy}>
            {isLoggingOut
              ? <Spinner className="h-4 w-4 border-current border-t-transparent" />
              : <LogOut className="h-4 w-4" />}
            {m['guards.signOut']()}
          </Button>
        </div>
      </div>
    </div>
  );
}

export function UnlinkedCreatorView(props: GuardProps) {
  return (
    <GuardScreen
      icon={<UserX className="h-8 w-8" />}
      title={m['guards.unlinked.title']()}
      description={m['guards.unlinked.description']()}
      recheckLabel={m['guards.unlinked.recheck']()}
      {...props}
    />
  );
}

export function NoStudioAssociationView(props: GuardProps) {
  return (
    <GuardScreen
      icon={<ShieldAlert className="h-8 w-8" />}
      title={m['guards.noStudio.title']()}
      description={m['guards.noStudio.description']()}
      recheckLabel={m['guards.noStudio.recheck']()}
      {...props}
    />
  );
}

export function ProfileErrorView({ onRecheck }: { onRecheck: () => Promise<void> }) {
  return (
    <GuardScreen
      icon={<ShieldAlert className="h-8 w-8 text-destructive" />}
      title={m['guards.profileError.title']()}
      description={m['guards.profileError.description']()}
      recheckLabel={m['guards.profileError.recheck']()}
      showUserCard={false}
      onRecheck={onRecheck}
    />
  );
}
