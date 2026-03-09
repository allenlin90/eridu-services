import { createFileRoute, Link } from '@tanstack/react-router';
import { ArrowLeft, Plus } from 'lucide-react';
import { useState } from 'react';
import { z } from 'zod';

import { Button, Card, CardContent, CardHeader, CardTitle } from '@eridu/ui';

import { AddMcDialog } from '@/features/studio-show-mcs/components/add-mc-dialog';
import { ShowMcList } from '@/features/studio-show-mcs/components/show-mc-list';
import { useShowMcs } from '@/features/studio-show-mcs/hooks/use-show-mcs';
import { useStudioShow } from '@/features/studio-shows/hooks/use-studio-show';

const showMcsSearchSchema = z.object({
  from: z.enum(['shows', 'creators']).optional().catch(undefined),
});

export const Route = createFileRoute('/studios/$studioId/shows/$showId/mcs')({
  validateSearch: (search) => showMcsSearchSchema.parse(search),
  component: ShowMcsPage,
});

function ShowMcsPage() {
  const { studioId, showId } = Route.useParams();
  const search = Route.useSearch();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  const { data: show } = useStudioShow({ studioId, showId });
  const { data, isLoading, addMutation, removeMutation } = useShowMcs(studioId, showId);

  const mcs = data?.data ?? [];
  const backToCreators = search.from === 'creators';

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="sm" className="gap-1.5">
            {backToCreators
              ? (
                  <Link to="/studios/$studioId/creators/mapping" params={{ studioId }}>
                    <ArrowLeft className="h-4 w-4" />
                    Back to Creator Mapping
                  </Link>
                )
              : (
                  <Link to="/studios/$studioId/shows" params={{ studioId }}>
                    <ArrowLeft className="h-4 w-4" />
                    Back to Shows
                  </Link>
                )}
          </Button>
          <CardTitle className="text-base">Assigned Creators</CardTitle>
        </div>
        <Button
          size="sm"
          onClick={() => setIsAddDialogOpen(true)}
          className="gap-1.5"
        >
          <Plus className="h-4 w-4" />
          Add Creator
        </Button>
      </CardHeader>

      <CardContent>
        <ShowMcList
          mcs={mcs}
          isLoading={isLoading}
          onRemove={(mcId) => removeMutation.mutate(mcId)}
          isRemoving={removeMutation.isPending}
        />
      </CardContent>

      {show && (
        <AddMcDialog
          open={isAddDialogOpen}
          onOpenChange={setIsAddDialogOpen}
          studioId={studioId}
          showStartTime={show.start_time}
          showEndTime={show.end_time}
          onAdd={(mcId) => {
            addMutation.mutate({ mc_id: mcId });
          }}
          isLoading={addMutation.isPending}
        />
      )}
    </Card>
  );
}
