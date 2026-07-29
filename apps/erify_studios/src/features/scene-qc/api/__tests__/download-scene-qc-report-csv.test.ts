import { beforeEach, describe, expect, it, vi } from 'vitest';

import { downloadSceneQcReportCsv } from '../download-scene-qc-report-csv';

import { apiClient } from '@/lib/api/client';
import { triggerBrowserDownload } from '@/lib/file-download';

vi.mock('@/lib/api/client', () => ({
  apiClient: { get: vi.fn() },
}));
vi.mock('@/lib/file-download', () => ({
  triggerBrowserDownload: vi.fn(),
}));

describe('downloadSceneQcReportCsv', () => {
  beforeEach(() => vi.clearAllMocks());

  it('fetches the server-owned report.csv endpoint as text and hands it to triggerBrowserDownload', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: 'csv,content' });

    await downloadSceneQcReportCsv('studio_abc', 'scqcc_1', 'scene-qc-report-2026-06-01-r1.csv');

    expect(apiClient.get).toHaveBeenCalledWith(
      '/studios/studio_abc/scene-qc-confirmations/scqcc_1/report.csv',
      { responseType: 'text' },
    );
    expect(triggerBrowserDownload).toHaveBeenCalledWith({
      content: 'csv,content',
      mimeType: 'text/csv;charset=utf-8;',
      filename: 'scene-qc-report-2026-06-01-r1.csv',
    });
  });

  it('never touches table row state -- it makes exactly one server request and never reads local component state', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: 'csv,content' });

    await downloadSceneQcReportCsv('studio_abc', 'scqcc_1', 'file.csv');

    expect(apiClient.get).toHaveBeenCalledTimes(1);
  });
});
