import { SceneQcPeriodReportService } from './scene-qc-period-report.service';

describe('sceneQcPeriodReportService', () => {
  it('centralizes counts, percentages, trends, clients, and issue labels', async () => {
    const query = {
      load: jest.fn().mockResolvedValue({
        trend: [{
          operational_date: new Date('2026-07-29T00:00:00.000Z'),
          total_count: 4n,
          pass_count: 3n,
          minor_count: 1n,
          fail_count: 0n,
        }],
        clients: [{
          client_id: 'client_1',
          client_name: 'Client One',
          total_count: 4n,
          pass_count: 3n,
          minor_count: 1n,
          fail_count: 0n,
        }],
        clientTrend: [{
          operational_date: new Date('2026-07-29T00:00:00.000Z'),
          client_id: 'client_1',
          client_name: 'Client One',
          total_count: 4n,
          pass_count: 3n,
          minor_count: 1n,
          fail_count: 0n,
        }],
        issues: [{
          element_key: 'logo',
          element_label: 'Logo',
          defect_key: 'missing',
          defect_label: 'Missing',
          count: 1n,
        }],
      }),
    };
    const service = new SceneQcPeriodReportService(query as never);

    const report = await service.getReport('std_1', '2026-07-29', '2026-07-29');

    expect(query.load).toHaveBeenCalledWith({
      studioUid: 'std_1',
      dateFrom: new Date('2026-07-29T00:00:00.000Z'),
      dateTo: new Date('2026-07-29T00:00:00.000Z'),
    });
    expect(report.summary).toEqual({
      total_count: 4,
      pass_count: 3,
      minor_count: 1,
      fail_count: 0,
      pass_percentage: 75,
    });
    expect(report.client_trend[0]).toMatchObject({
      operational_date: '2026-07-29',
      client_id: 'client_1',
    });
    expect(report.issue_breakdown[0]).toMatchObject({
      element_label: 'Logo',
      defect_label: 'Missing',
      count: 1,
    });
  });
});
