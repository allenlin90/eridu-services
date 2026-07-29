import { apiClient } from '@/lib/api/client';
import { triggerBrowserDownload } from '@/lib/file-download';

/**
 * The server owns the CSV columns and guarantees the complete confirmation
 * item set, never whatever a UI table happened to have paginated to (§7.6).
 * A plain `<a href>` cannot be used -- the API needs the JWT bearer header,
 * so the file is fetched then handed to `triggerBrowserDownload`.
 */
export async function downloadSceneQcReportCsv(
  studioId: string,
  confirmationId: string,
  filename: string,
): Promise<void> {
  const response = await apiClient.get<string>(
    `/studios/${studioId}/scene-qc-confirmations/${confirmationId}/report.csv`,
    { responseType: 'text' },
  );
  triggerBrowserDownload({ content: response.data, mimeType: 'text/csv;charset=utf-8;', filename });
}
