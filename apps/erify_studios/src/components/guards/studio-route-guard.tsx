import type { ReactNode } from 'react';

import { Card, CardContent, CardHeader, CardTitle } from '@eridu/ui';

import type { StudioRouteAccessKey } from '@/lib/constants/studio-route-access';
import { useStudioAccess } from '@/lib/hooks/use-studio-access';

type StudioRouteGuardProps = {
  studioId: string;
  routeKey: StudioRouteAccessKey;
  children: ReactNode;
  loadingMessage?: string;
  deniedTitle?: string;
  deniedDescription?: string;
};

export function StudioRouteGuard({
  studioId,
  routeKey,
  children,
  loadingMessage = 'Checking access...',
  deniedTitle = 'Access Required',
  deniedDescription = 'You do not have permission to access this page.',
}: StudioRouteGuardProps) {
  const { isLoading, hasAccess } = useStudioAccess(studioId);

  if (isLoading) {
    return (
      <div className="flex flex-1 flex-col gap-4 p-4 pt-2">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">{loadingMessage}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!hasAccess(routeKey)) {
    return (
      <div className="flex flex-1 flex-col gap-4 p-4 pt-2">
        <Card>
          <CardHeader>
            <CardTitle>{deniedTitle}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {deniedDescription}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}
