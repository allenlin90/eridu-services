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
import { ShowReadinessTriagePanel } from '@/features/studio-shows/components/show-readiness/show-readiness-triage-panel';
import { TaskSetupShowsSection } from '@/features/studio-shows/components/studio-shows-table/task-setup-shows-section';
import { useTaskSetupPageController } from '@/features/studio-shows/hooks/use-task-setup-page-controller';
import { formatScopeLabel } from '@/features/studio-shows/utils/task-setup-scope.utils';

export const Route = createFileRoute('/studios/$studioId/task-setup/')({
  component: StudioTaskSetupPage,
});

/**
 * Task Setup page — planning surface for generating, reviewing, and assigning
 * tasks across studio shows within a date scope.
 *
 * Composition (decomposed from a single 753-LOC route):
 *
 *   StudioTaskSetupPage (this container — wires state to presentation)
 *   │
 *   ├─ useTaskSetupPageController()        scope date state, URL search sync,
 *   │  (hooks/…)                           readiness-snapshot queries, and the
 *   │                                      refresh signal shared across sections
 *   │
 *   ├─ <ShowReadinessTriagePanel/>         readiness summary for the scope
 *   │
 *   └─ <TaskSetupShowsSection/>            paginated shows table + row selection,
 *      (components/studio-shows-table/…)   export, and bulk generate/assign dialogs
 *
 * Pure scope/date helpers live in utils/task-setup-scope.utils.ts.
 */
function StudioTaskSetupPage() {
  const {
    studioId,
    scopeDateFrom,
    scopeDateTo,
    isNeedsAttentionActive,
    attentionShowUids,
    pickerScopeDateRange,
    setDraftScopeDateRange,
    isScopeDatePickerOpen,
    onScopeDatePickerOpenChange,
    onResetScope,
    showsInScopeCount,
    taskReadinessWarnings,
    isLoadingSnapshot,
    isFetchingSnapshot,
    isReadinessSnapshotVisible,
    hasIncompletePlanningRange,
    hasInvalidPlanningRange,
    refreshSnapshotQueries,
    activateIssuesFilter,
    toggleReadinessVisibility,
    triggerSnapshotRefresh,
    toggleNeedsAttention,
  } = useTaskSetupPageController();

  const scopeLabel = formatScopeLabel(scopeDateFrom, scopeDateTo);

  return (
    <PageLayout
      title="Task Setup"
      description="Generate tasks, review readiness, and assign work across studio shows."
    >
      <div className="space-y-4">
        <Card>
          <CardHeader className="gap-3">
            <div className="space-y-1">
              <CardTitle className="text-base">Scope</CardTitle>
              <CardDescription>
                This date range applies to both readiness summary and show list.
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

        <ShowReadinessTriagePanel
          scopeLabel={scopeLabel}
          showsInScopeCount={showsInScopeCount}
          taskReadinessWarnings={taskReadinessWarnings}
          isLoading={isLoadingSnapshot}
          isFetching={isFetchingSnapshot}
          isVisible={isReadinessSnapshotVisible}
          hasIncompletePlanningRange={hasIncompletePlanningRange}
          hasInvalidPlanningRange={hasInvalidPlanningRange}
          needsAttentionActive={isNeedsAttentionActive}
          onRefresh={refreshSnapshotQueries}
          onToggleVisibility={toggleReadinessVisibility}
          onActivateIssuesFilter={activateIssuesFilter}
        />

        <TaskSetupShowsSection
          studioId={studioId}
          scopeDateFrom={scopeDateFrom}
          scopeDateTo={scopeDateTo}
          scopeLabel={scopeLabel}
          needsAttention={isNeedsAttentionActive}
          attentionShowUids={attentionShowUids}
          onShowsMutated={triggerSnapshotRefresh}
          onToggleNeedsAttention={toggleNeedsAttention}
        />
      </div>
    </PageLayout>
  );
}
