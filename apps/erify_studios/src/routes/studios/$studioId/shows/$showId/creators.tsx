import { createFileRoute, Link } from '@tanstack/react-router';
import { ArrowLeft, Plus } from 'lucide-react';
import { useState } from 'react';
import { z } from 'zod';

import { Button, Card, CardContent, CardHeader, CardTitle } from '@eridu/ui';

import { AddCreatorDialog } from '@/features/studio-show-creators/components/add-creator-dialog';
import { ShowCreatorList } from '@/features/studio-show-creators/components/show-creator-list';
import { useShowCreators } from '@/features/studio-show-creators/hooks/use-show-creators';
import { useStudioShow } from '@/features/studio-shows/hooks/use-studio-show';

const showCreatorsSearchSchema = z.object({
  from: z.enum(['shows', 'creators']).optional().catch(undefined),
});

export const Route = createFileRoute('/studios/$studioId/shows/$showId/creators')({
  validateSearch: (search) => showCreatorsSearchSchema.parse(search),
  component: ShowCreatorsPage,
});

function ShowCreatorsPage() {
  const { studioId, showId } = Route.useParams();
  const search = Route.useSearch();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  const { data: show } = useStudioShow({ studioId, showId });
  const { data, isLoading, addMutation, removeMutation } = useShowCreators(studioId, showId);

  const creators = data?.data ?? [];
  const backToCreators = search.from === 'creators';

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="sm" className="gap-1.5">
            {backToCreators
              ? (
                  <Link to="/studios/$studioId/creators/mapping" params={{ studioId }} search={{ page: 1, pageSize: 10 }}>
                    <ArrowLeft className="h-4 w-4" />
                    Back to Creator Mapping
                  </Link>
                )
              : (
                  <Link to="/studios/$studioId/shows" params={{ studioId }} search={{ page: 1, pageSize: 10 }}>
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
        <ShowCreatorList
          creators={creators}
          isLoading={isLoading}
          onRemove={(creatorId) => removeMutation.mutate(creatorId)}
          isRemoving={removeMutation.isPending}
        />
      </CardContent>

      {show && (
        <AddCreatorDialog
          open={isAddDialogOpen}
          onOpenChange={setIsAddDialogOpen}
          studioId={studioId}
          showStartTime={show.start_time}
          showEndTime={show.end_time}
          onAdd={(creatorId) => {
            addMutation.mutate({ creator_id: creatorId });
          }}
          isLoading={addMutation.isPending}
        />
      )}
    </Card>
  );
}
