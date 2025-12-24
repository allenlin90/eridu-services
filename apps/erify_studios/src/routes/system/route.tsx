import { createFileRoute, Outlet, useNavigate } from '@tanstack/react-router';
import { Loader2 } from 'lucide-react';

import { useUserProfile } from '@/lib/hooks/use-user';
import * as m from '@/paraglide/messages';

export const Route = createFileRoute('/system')({
  component: AdminLayout,
});

function AdminLayout() {
  const navigate = useNavigate();
  const { data: user, isLoading, isError } = useUserProfile();

  if (isLoading) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center p-4">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <p className="mt-2 text-sm text-muted-foreground">{m.admin_access_verifying()}</p>
      </div>
    );
  }

  // Not logged in or API error
  if (isError || !user) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center p-4">
        <h2 className="text-xl font-semibold">{m.admin_access_denied_title()}</h2>
        <p className="mt-2 text-muted-foreground">{m.admin_access_denied_desc()}</p>
        <button
          type="button"
          onClick={() => navigate({ to: '/' })}
          className="mt-4 rounded bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90"
        >
          {m.go_home()}
        </button>
      </div>
    );
  }

  // Logged in but not system admin
  if (!user.is_system_admin) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center p-4">
        <h2 className="text-xl font-semibold">{m.admin_access_required_title()}</h2>
        <p className="mt-2 text-muted-foreground">{m.admin_access_required_desc()}</p>
        <button
          type="button"
          onClick={() => navigate({ to: '/' })}
          className="mt-4 rounded bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90"
        >
          {m.go_home()}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <Outlet />
    </div>
  );
}
