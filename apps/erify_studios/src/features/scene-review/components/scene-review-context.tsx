import { ChevronDown } from 'lucide-react';

import type { SceneReviewDetail } from '@eridu/api-types/task-management';
import {
  Badge,
  Card,
  CardContent,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@eridu/ui';

import * as m from '@/paraglide/messages';

type SceneReviewContextProps = {
  detail: SceneReviewDetail;
};

export function SceneReviewContext({ detail }: SceneReviewContextProps) {
  const metrics = [
    ['GMV', detail.metrics.gmv],
    ['Viewers', detail.metrics.viewers],
    ['CTR', detail.metrics.ctr],
    ['CTO', detail.metrics.cto],
  ].filter((entry): entry is [string, string] => Boolean(entry[1]));

  return (
    <div className="space-y-3">
      <Collapsible>
        <Card>
          <CollapsibleTrigger className="flex w-full items-center justify-between p-4 text-left">
            <div>
              <p className="text-sm font-semibold">{m.scene_review_show_context()}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{detail.show.name}</p>
            </div>
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="grid gap-3 border-t pt-4 text-sm sm:grid-cols-3">
              <div>
                <p className="text-xs text-muted-foreground">{m.scene_review_show_date()}</p>
                <p>{new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(detail.show.start_time))}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{m.scene_review_client()}</p>
                <p>{detail.client?.name ?? '—'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{m.scene_review_platform()}</p>
                <p>{detail.platforms.map((platform) => platform.name).join(', ') || '—'}</p>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      <div className="grid gap-3 sm:grid-cols-2">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm font-semibold">{m.scene_review_metrics()}</p>
            {metrics.length > 0
              ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {metrics.map(([label, value]) => (
                      <Badge key={label} variant="secondary">
                        {label}
                        :
                        {' '}
                        {value}
                      </Badge>
                    ))}
                  </div>
                )
              : <p className="mt-2 text-xs text-muted-foreground">{m.scene_review_metrics_missing()}</p>}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm font-semibold">{m.scene_review_reference_title()}</p>
            <p className="mt-2 text-xs text-muted-foreground">{m.scene_review_reference_missing()}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
