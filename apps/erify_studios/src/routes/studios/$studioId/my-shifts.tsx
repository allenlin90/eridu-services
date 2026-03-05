import { createFileRoute } from '@tanstack/react-router';
import { useMemo } from 'react';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@eridu/ui';

import { StudioShiftsCalendar } from '@/features/studio-shifts/components/studio-shifts-calendar';
import { useUserProfile } from '@/lib/hooks/use-user';

export const Route = createFileRoute('/studios/$studioId/my-shifts')({
  component: MyShiftsPage,
});

function MyShiftsPage() {
  const { studioId } = Route.useParams();
  const { data: profile, isLoading: isLoadingProfile } = useUserProfile();

  const activeMembership = useMemo(
    () => profile?.studio_memberships?.find((membership) => membership.studio.uid === studioId),
    [profile?.studio_memberships, studioId],
  );

  if (isLoadingProfile) {
    return (
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Checking access...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!activeMembership) {
    return (
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <Card>
          <CardHeader>
            <CardTitle>My Shifts Access Required</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              You must be a member of this studio to view personal shifts.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">My Shifts</h1>
        <p className="text-muted-foreground">
          Read-only schedule for your assigned shift blocks.
        </p>
      </div>
      <StudioShiftsCalendar
        studioId={studioId}
        queryScope="me"
        summaryText="Read-only view of your assigned shift blocks."
      />
    </div>
  );
}
