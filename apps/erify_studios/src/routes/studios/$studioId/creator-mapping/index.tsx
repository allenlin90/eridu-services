import { createFileRoute } from '@tanstack/react-router';

import {
  Button,
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
  DatePickerWithRange,
} from '@eridu/ui';

import { PageLayout } from '@/components/layouts/page-layout';
import { CreatorMappingShowsSection } from '@/features/studio-show-creators/components/creator-mapping-shows-section';
import { useCreatorMappingPageController } from '@/features/studio-show-creators/hooks/use-creator-mapping-page-controller';
import { formatScopeLabel } from '@/features/studio-shows/utils/planning-scope.utils';

/**
 * Creator Mapping page — assign and manage creators across studio shows within
 * a date scope.
 *
 * Composition (decomposed from a single 470-LOC route):
 *
 *   CreatorMappingPage (this container — wires scope to presentation)
 *   │
 *   ├─ useCreatorMappingPageController()    planning-scope date state + URL
 *   │  (hooks/…)                            search sync (next-7-days default)
 *   │
 *   └─ <CreatorMappingShowsSection/>        paginated shows table + row
 *      (components/…)                       selection, client/creator filters,
 *                                           CSV export, bulk assign dialog
 *
 * Pure scope/date helpers live in studio-shows/utils/planning-scope.utils.ts
 * (shared with the Task Setup route).
 */
function CreatorMappingPage() {
  const {
    studioId,
    scopeDateFrom,
    scopeDateTo,
    pickerScopeDateRange,
    setDraftScopeDateRange,
    isScopeDatePickerOpen,
    onScopeDatePickerOpenChange,
    onResetScope,
  } = useCreatorMappingPageController();

  const scopeLabel = formatScopeLabel(scopeDateFrom, scopeDateTo);

  return (
    <PageLayout
      title="Creator Mapping"
      description="Assign and manage creators across studio shows."
    >
      <div className="space-y-4 pb-20 md:pb-0">
        <Card>
          <CardHeader className="gap-3">
            <div className="space-y-1">
              <CardTitle className="text-base">Scope</CardTitle>
              <CardDescription>
                This date range applies to the creator mapping show list.
              </CardDescription>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <DatePickerWithRange
                  date={pickerScopeDateRange}
                  setDate={setDraftScopeDateRange}
                  open={isScopeDatePickerOpen}
                  onOpenChange={onScopeDatePickerOpenChange}
                />
                <Button variant="outline" size="sm" onClick={onResetScope}>
                  Next 7 Days
                </Button>
              </div>
            </div>
          </CardHeader>
        </Card>

        <CreatorMappingShowsSection
          studioId={studioId}
          scopeDateFrom={scopeDateFrom}
          scopeDateTo={scopeDateTo}
          scopeLabel={scopeLabel}
        />
      </div>
    </PageLayout>
  );
}

export const Route = createFileRoute('/studios/$studioId/creator-mapping/')({
  component: CreatorMappingPage,
});
