import { LogOut, RefreshCw, ShieldAlert, UserX } from 'lucide-react';
import { useState } from 'react';

import { Spinner } from '@eridu/ui';

import { authClient } from '@/lib/auth';

type GuardProps = {
  userName?: string;
  userEmail?: string;
  avatarUrl?: string;
  onRecheck: () => Promise<void>;
};

export function UnlinkedCreatorView({ userName, userEmail, avatarUrl, onRecheck }: GuardProps) {
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

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-slate-950 p-6 overflow-hidden">
      {/* Background Radial Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-1/3 left-1/3 w-[300px] h-[300px] bg-emerald-500/5 rounded-full blur-[100px] pointer-events-none" />

      {/* Main Glass Card */}
      <div className="relative w-full max-w-md bg-slate-900/50 backdrop-blur-xl border border-slate-800/80 rounded-2xl p-8 text-center shadow-2xl shadow-slate-950/50 transition-all duration-300 hover:border-slate-700/50">

        {/* Animated Icon Container */}
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-slate-800/60 border border-slate-700/50 text-indigo-400 mb-6 shadow-inner relative group">
          <div className="absolute inset-0 rounded-full bg-indigo-500/20 blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <UserX className="h-8 w-8 relative z-10 animate-pulse" />
        </div>

        <h1 className="text-2xl font-bold tracking-tight text-slate-100 mb-2">
          Account Unlinked
        </h1>
        <p className="text-sm text-slate-400 mb-6 px-2 leading-relaxed">
          Your account is not yet connected to a Creator Profile. Please contact your studio manager to link your account.
        </p>

        {/* User Card */}
        {(userName || userEmail) && (
          <div className="flex items-center gap-3 bg-slate-950/40 border border-slate-800/50 rounded-xl p-4 mb-8 text-left">
            <img
              src={avatarUrl || '/avatars/default.jpg'}
              alt={userName || 'User'}
              className="h-10 w-10 rounded-full border border-slate-800 object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/avatars/default.jpg';
              }}
            />
            <div className="overflow-hidden">
              <p className="text-sm font-medium text-slate-200 truncate">{userName}</p>
              <p className="text-xs text-slate-500 truncate">{userEmail}</p>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={handleRecheck}
            disabled={isRechecking || isLoggingOut}
            className="flex items-center justify-center gap-2 w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 disabled:opacity-50 text-slate-100 font-medium text-sm rounded-xl transition-all duration-200 shadow-lg shadow-indigo-600/10 cursor-pointer"
          >
            {isRechecking
              ? (
                  <Spinner className="h-4 w-4 border-slate-100 border-t-transparent" />
                )
              : (
                  <RefreshCw className="h-4 w-4" />
                )}
            Check Status Again
          </button>

          <button
            type="button"
            onClick={handleLogout}
            disabled={isRechecking || isLoggingOut}
            className="flex items-center justify-center gap-2 w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-850 active:bg-slate-950 text-slate-300 font-medium text-sm rounded-xl border border-slate-800 transition-all duration-200 cursor-pointer disabled:opacity-50"
          >
            {isLoggingOut
              ? (
                  <Spinner className="h-4 w-4 border-slate-300 border-t-transparent" />
                )
              : (
                  <LogOut className="h-4 w-4" />
                )}
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}

export function NoStudioAssociationView({ userName, userEmail, avatarUrl, onRecheck }: GuardProps) {
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

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-slate-950 p-6 overflow-hidden">
      {/* Radial indigo gradient background */}
      <div className="absolute inset-0 bg-radial-[circle_at_center,var(--color-indigo-950)_0%,var(--color-slate-950)_70%] opacity-40 pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-violet-500/10 rounded-full blur-[140px] pointer-events-none" />

      {/* Main Glass Card */}
      <div className="relative w-full max-w-md bg-slate-900/50 backdrop-blur-xl border border-slate-800/80 rounded-2xl p-8 text-center shadow-2xl shadow-indigo-950/30 transition-all duration-300 hover:border-slate-700/50">

        {/* Animated Icon Container */}
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-slate-800/60 border border-slate-700/50 text-indigo-400 mb-6 shadow-inner relative group">
          <div className="absolute inset-0 rounded-full bg-indigo-500/20 blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <ShieldAlert className="h-8 w-8 relative z-10 animate-bounce" />
        </div>

        <h1 className="text-2xl font-bold tracking-tight text-slate-100 mb-2">
          Roster Verification Pending
        </h1>
        <p className="text-sm text-slate-400 mb-6 px-2 leading-relaxed">
          Your profile is not yet active on any studio rosters. Contact your studio manager to activate your studio memberships.
        </p>

        {/* User Card */}
        {(userName || userEmail) && (
          <div className="flex items-center gap-3 bg-slate-950/40 border border-slate-800/50 rounded-xl p-4 mb-8 text-left">
            <img
              src={avatarUrl || '/avatars/default.jpg'}
              alt={userName || 'User'}
              className="h-10 w-10 rounded-full border border-slate-800 object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/avatars/default.jpg';
              }}
            />
            <div className="overflow-hidden">
              <p className="text-sm font-medium text-slate-200 truncate">{userName}</p>
              <p className="text-xs text-slate-500 truncate">{userEmail}</p>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={handleRecheck}
            disabled={isRechecking || isLoggingOut}
            className="flex items-center justify-center gap-2 w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 disabled:opacity-50 text-slate-100 font-medium text-sm rounded-xl transition-all duration-200 shadow-lg shadow-indigo-600/10 cursor-pointer"
          >
            {isRechecking
              ? (
                  <Spinner className="h-4 w-4 border-slate-100 border-t-transparent" />
                )
              : (
                  <RefreshCw className="h-4 w-4" />
                )}
            Recheck Roster Status
          </button>

          <button
            type="button"
            onClick={handleLogout}
            disabled={isRechecking || isLoggingOut}
            className="flex items-center justify-center gap-2 w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-850 active:bg-slate-950 text-slate-300 font-medium text-sm rounded-xl border border-slate-800 transition-all duration-200 cursor-pointer disabled:opacity-50"
          >
            {isLoggingOut
              ? (
                  <Spinner className="h-4 w-4 border-slate-300 border-t-transparent" />
                )
              : (
                  <LogOut className="h-4 w-4" />
                )}
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}

export function ProfileErrorView({ onRecheck }: { onRecheck: () => Promise<void> }) {
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

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-slate-950 p-6 overflow-hidden">
      {/* Background Radial Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-red-500/5 rounded-full blur-[120px] pointer-events-none" />

      {/* Main Glass Card */}
      <div className="relative w-full max-w-md bg-slate-900/50 backdrop-blur-xl border border-red-950/85 rounded-2xl p-8 text-center shadow-2xl transition-all duration-300 hover:border-red-900/50">
        
        {/* Animated Icon Container */}
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-slate-800/60 border border-slate-700/50 text-red-400 mb-6 shadow-inner relative group">
          <div className="absolute inset-0 rounded-full bg-red-500/10 blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <ShieldAlert className="h-8 w-8 relative z-10" />
        </div>

        <h1 className="text-2xl font-bold tracking-tight text-slate-100 mb-2">
          Failed to Load Profile
        </h1>
        <p className="text-sm text-slate-400 mb-8 px-2 leading-relaxed">
          An error occurred while loading your creator profile information. This may be due to a transient connection failure. Please try again.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={handleRecheck}
            disabled={isRechecking || isLoggingOut}
            className="flex items-center justify-center gap-2 w-full py-2.5 px-4 bg-red-600 hover:bg-red-500 active:bg-red-700 disabled:opacity-50 text-slate-100 font-medium text-sm rounded-xl transition-all duration-200 shadow-lg shadow-red-600/10 cursor-pointer"
          >
            {isRechecking
              ? (
                  <Spinner className="h-4 w-4 border-slate-100 border-t-transparent" />
                )
              : (
                  <RefreshCw className="h-4 w-4" />
                )}
            Try Again
          </button>
          
          <button
            type="button"
            onClick={handleLogout}
            disabled={isRechecking || isLoggingOut}
            className="flex items-center justify-center gap-2 w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-850 active:bg-slate-950 text-slate-300 font-medium text-sm rounded-xl border border-slate-800 transition-all duration-200 cursor-pointer disabled:opacity-50"
          >
            {isLoggingOut
              ? (
                  <Spinner className="h-4 w-4 border-slate-300 border-t-transparent" />
                )
              : (
                  <LogOut className="h-4 w-4" />
                )}
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}

