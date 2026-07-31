import { useCallback, useState } from 'react';

import type { SceneQcSearch } from '../config/scene-qc-search-schema';

import { SceneQcDailyWorkspace } from './scene-qc-daily-workspace';
import { SceneQcRecordsView } from './scene-qc-records-view';
import { SceneQcReportSheet } from './scene-qc-report-sheet';
import { SceneQcReportsWorkspace } from './scene-qc-reports-workspace';
import { SceneQcTabs } from './scene-qc-tabs';

type SceneQcWorkspaceProps = {
  studioId: string;
  search: SceneQcSearch;
  onSearchChange: (next: Partial<SceneQcSearch>) => void;
};

/**
 * Tab shell: composition only, well under 200 LOC. Owns the Manager Report
 * sheet's open state since both the Daily confirmation card and Records rows
 * can open a report. See "Records and manager report" in
 * apps/erify_studios/docs/SCENE_QC.md.
 */
export function SceneQcWorkspace({ studioId, search, onSearchChange }: SceneQcWorkspaceProps) {
  const [reportConfirmationId, setReportConfirmationId] = useState<string | null>(null);

  const handleTabChange = useCallback((tab: 'daily' | 'records' | 'reports') => {
    // §7.1: switching tabs resets pagination and clears the OTHER tab's
    // exclusive selection param; client_id/platform_id deliberately survive
    // the switch (OQ-35).
    onSearchChange(
      tab === 'daily'
        ? { tab, page: 1, record_id: undefined }
        : { tab, page: 1, show_id: undefined, record_id: tab === 'reports' ? undefined : search.record_id },
    );
  }, [onSearchChange, search.record_id]);

  return (
    <div className="min-w-0 space-y-4">
      <SceneQcTabs tab={search.tab} onTabChange={handleTabChange} />

      {search.tab === 'daily'
        ? (
            <SceneQcDailyWorkspace
              studioId={studioId}
              search={search}
              onSearchChange={onSearchChange}
              onOpenReport={setReportConfirmationId}
            />
          )
        : search.tab === 'records'
          ? (
              <SceneQcRecordsView
                studioId={studioId}
                search={search}
                onSearchChange={onSearchChange}
                onOpenReport={setReportConfirmationId}
              />
            )
          : (
              <SceneQcReportsWorkspace
                studioId={studioId}
                search={search}
                onSearchChange={onSearchChange}
              />
            )}

      <SceneQcReportSheet
        studioId={studioId}
        confirmationId={reportConfirmationId}
        open={Boolean(reportConfirmationId)}
        onOpenChange={(open) => {
          if (!open)
            setReportConfirmationId(null);
        }}
      />
    </div>
  );
}
