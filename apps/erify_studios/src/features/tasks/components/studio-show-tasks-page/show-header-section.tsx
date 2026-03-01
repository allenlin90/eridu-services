import { Link } from '@tanstack/react-router';
import { ArrowLeft, ChevronDown } from 'lucide-react';

import { Badge, Button } from '@eridu/ui';

import type { StudioShowDetail } from '@/features/studio-shows/api/get-studio-show';
import type { ShowMetaItem } from '@/features/tasks/lib/studio-show-tasks-page';

type ShowHeaderSectionProps = {
  studioId: string;
  isLoadingShow: boolean;
  showDetails: StudioShowDetail | undefined;
  showSubtitle: string;
  isShowDetailsOpen: boolean;
  onToggleShowDetails: () => void;
  showMetaItems: ShowMetaItem[];
};

export function ShowHeaderSection({
  studioId,
  isLoadingShow,
  showDetails,
  showSubtitle,
  isShowDetailsOpen,
  onToggleShowDetails,
  showMetaItems,
}: ShowHeaderSectionProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/studios/$studioId/shows" params={{ studioId }}>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-bold tracking-tight">
              {isLoadingShow && !showDetails ? 'Loading show...' : (showDetails?.name ?? 'Show Tasks')}
            </h1>
            <p className="text-sm text-muted-foreground">{showSubtitle}</p>
          </div>
        </div>
      </div>

      {showDetails && (
        <div className="rounded-md border bg-muted/20 p-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-medium text-muted-foreground">Show Details</p>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={onToggleShowDetails}
            >
              {isShowDetailsOpen ? 'Hide' : 'Show'}
              <ChevronDown className={`ml-1 h-3.5 w-3.5 transition-transform ${isShowDetailsOpen ? 'rotate-180' : ''}`} />
            </Button>
          </div>

          {isShowDetailsOpen && (
            <>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {showDetails.show_status_name && (
                  <Badge variant="outline" className="capitalize">
                    {showDetails.show_status_name}
                  </Badge>
                )}
                {showDetails.show_type_name && (
                  <Badge variant="secondary" className="capitalize">
                    {showDetails.show_type_name}
                  </Badge>
                )}
                {showDetails.show_standard_name && (
                  <Badge variant="outline" className="capitalize">
                    {showDetails.show_standard_name}
                  </Badge>
                )}
              </div>

              <dl className="mt-3 grid grid-cols-1 gap-2 text-xs sm:grid-cols-2 lg:grid-cols-5">
                {showMetaItems.map((item) => (
                  <div key={item.label} className="rounded border bg-background px-2 py-1.5">
                    <dt className="text-muted-foreground">{item.label}</dt>
                    <dd className="truncate font-medium" title={item.value}>
                      {item.value}
                    </dd>
                  </div>
                ))}
              </dl>
            </>
          )}
        </div>
      )}
    </div>
  );
}
