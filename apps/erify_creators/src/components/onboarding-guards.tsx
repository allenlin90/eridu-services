import { LogOut, RefreshCw, ShieldAlert, UserX } from 'lucide-react';
import { type ReactNode, useState } from 'react';

import { Spinner } from '@eridu/ui';

import { authClient } from '@/lib/auth';

type GuardProps = {
  userName?: string;
  userEmail?: string;
  avatarUrl?: string;
  onRecheck: () => Promise<void>;
};

type GuardTone = 'primary' | 'destructive';

const TONE: Record<GuardTone, { glow: string; iconColor: string; iconGlow: string; primaryButton: string; cardBorder: string }> = {
  primary: {
    glow: 'bg-indigo-500/10',
    iconColor: 'text-indigo-400',
    iconGlow: 'bg-indigo-500/20',
    primaryButton: 'bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 shadow-indigo-600/10',
    cardBorder: 'border-slate-800/80 hover:border-slate-700/50',
  },
  destructive: {
    glow: 'bg-red-500/5',
    iconColor: 'text-red-400',
    iconGlow: 'bg-red-500/10',
    primaryButton: 'bg-red-600 hover:bg-red-500 active:bg-red-700 shadow-red-600/10',
    cardBorder: 'border-red-950/85 hover:border-red-900/50',
  },
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
  tone?: GuardTone;
  icon: ReactNode;
  title: string;
  description: string;
  recheckLabel: string;
  showUserCard?: boolean;
} & Pick<GuardProps, 'userName' | 'userEmail' | 'avatarUrl' | 'onRecheck'>;

function GuardScreen({
  tone = 'primary',
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
  const palette = TONE[tone];

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 p-6">
      {/* Background Radial Glow */}
      <div
        className={`pointer-events-none absolute top-1/2 left-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full blur-[120px] ${palette.glow}`}
      />

      {/* Main Glass Card */}
      <div
        className={`relative w-full max-w-md rounded-2xl border bg-slate-900/50 p-8 text-center shadow-2xl backdrop-blur-xl transition-all duration-300 ${palette.cardBorder}`}
      >
        {/* Animated Icon Container */}
        <div className="group relative mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full border border-slate-700/50 bg-slate-800/60 shadow-inner">
          <div
            className={`absolute inset-0 rounded-full opacity-0 blur-md transition-opacity duration-300 group-hover:opacity-100 ${palette.iconGlow}`}
          />
          <div className={`relative z-10 ${palette.iconColor}`}>{icon}</div>
        </div>

        <h1 className="mb-2 text-2xl font-bold tracking-tight text-slate-100">{title}</h1>
        <p className="mb-6 px-2 text-sm leading-relaxed text-slate-400">{description}</p>

        {/* User Card */}
        {showUserCard && (userName || userEmail)
          ? (
              <div className="mb-8 flex items-center gap-3 rounded-xl border border-slate-800/50 bg-slate-950/40 p-4 text-left">
                <img
                  src={avatarUrl || '/avatars/default.jpg'}
                  alt={userName || 'User'}
                  className="h-10 w-10 rounded-full border border-slate-800 object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/avatars/default.jpg';
                  }}
                />
                <div className="overflow-hidden">
                  <p className="truncate text-sm font-medium text-slate-200">{userName}</p>
                  <p className="truncate text-xs text-slate-500">{userEmail}</p>
                </div>
              </div>
            )
          : null}

        {/* Action Buttons */}
        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={handleRecheck}
            disabled={busy}
            className={`flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium text-slate-100 shadow-lg transition-all duration-200 disabled:opacity-50 ${palette.primaryButton}`}
          >
            {isRechecking
              ? <Spinner className="h-4 w-4 border-slate-100 border-t-transparent" />
              : <RefreshCw className="h-4 w-4" />}
            {recheckLabel}
          </button>

          <button
            type="button"
            onClick={handleLogout}
            disabled={busy}
            className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-slate-800 bg-slate-900 px-4 py-2.5 text-sm font-medium text-slate-300 transition-all duration-200 hover:bg-slate-800 active:bg-slate-950 disabled:opacity-50"
          >
            {isLoggingOut
              ? <Spinner className="h-4 w-4 border-slate-300 border-t-transparent" />
              : <LogOut className="h-4 w-4" />}
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}

export function UnlinkedCreatorView(props: GuardProps) {
  return (
    <GuardScreen
      icon={<UserX className="h-8 w-8 animate-pulse" />}
      title="Account Unlinked"
      description="Your account is not yet connected to a Creator Profile. Please contact your studio manager to link your account."
      recheckLabel="Check Status Again"
      {...props}
    />
  );
}

export function NoStudioAssociationView(props: GuardProps) {
  return (
    <GuardScreen
      icon={<ShieldAlert className="h-8 w-8 animate-bounce" />}
      title="Roster Verification Pending"
      description="Your profile is not yet active on any studio rosters. Contact your studio manager to activate your studio memberships."
      recheckLabel="Recheck Roster Status"
      {...props}
    />
  );
}

export function ProfileErrorView({ onRecheck }: { onRecheck: () => Promise<void> }) {
  return (
    <GuardScreen
      tone="destructive"
      icon={<ShieldAlert className="h-8 w-8" />}
      title="Failed to Load Profile"
      description="An error occurred while loading your creator profile information. This may be due to a transient connection failure. Please try again."
      recheckLabel="Try Again"
      showUserCard={false}
      onRecheck={onRecheck}
    />
  );
}
