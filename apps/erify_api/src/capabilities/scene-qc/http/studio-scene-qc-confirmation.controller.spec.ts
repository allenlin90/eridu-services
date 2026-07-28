import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';

import { STUDIO_ROLE } from '@eridu/api-types/memberships';

import { SceneQcConfirmationWorkflowService } from '../scene-qc-confirmation-workflow.service';
import { SceneQcReportService } from '../scene-qc-report.service';

import { StudioSceneQcConfirmationController } from './studio-scene-qc-confirmation.controller';

import { STUDIO_ROLES_KEY } from '@/lib/decorators/studio-protected.decorator';

function buildReport(overrides: Record<string, unknown> = {}) {
  return {
    confirmation_id: 'scqcc_a',
    confirmation_revision: 3,
    status: 'CURRENT',
    studio: { id: 'std_1', name: 'Main Studio' },
    operational_date: '2026-08-01',
    window_start: '2026-08-01T06:00:00.000Z',
    window_end: '2026-08-02T06:00:00.000Z',
    timezone: 'Asia/Bangkok',
    confirmed_by: { id: 'user_1', name: 'Manager One' },
    confirmed_at: '2026-08-01T08:00:00.000Z',
    generated_at: '2026-08-01T09:00:00.000Z',
    scope: { total_shows: 0, pass_count: 0, minor_count: 0, fail_count: 0, pass_percentage: 0, minor_percentage: 0, fail_percentage: 0 },
    client_breakdown: [],
    platform_breakdown: [],
    shows: [],
    exceptions: [],
    ...overrides,
  };
}

describe('studioSceneQcConfirmationController', () => {
  let controller: StudioSceneQcConfirmationController;
  let workflowService: jest.Mocked<SceneQcConfirmationWorkflowService>;
  let reportService: jest.Mocked<SceneQcReportService>;

  const studioId = 'std_1';
  const user = { ext_id: 'ext_1' } as never;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [StudioSceneQcConfirmationController],
      providers: [
        { provide: SceneQcConfirmationWorkflowService, useValue: { confirmDay: jest.fn() } },
        { provide: SceneQcReportService, useValue: { getReport: jest.fn() } },
      ],
    }).compile();

    controller = module.get(StudioSceneQcConfirmationController);
    workflowService = module.get(SceneQcConfirmationWorkflowService);
    reportService = module.get(SceneQcReportService);
  });

  it('grants access to DESIGNER, MANAGER, and ADMIN only', () => {
    const roles = Reflect.getMetadata(STUDIO_ROLES_KEY, StudioSceneQcConfirmationController);
    expect(roles).toEqual([STUDIO_ROLE.DESIGNER, STUDIO_ROLE.MANAGER, STUDIO_ROLE.ADMIN]);
  });

  it('exposes distinct report and report.csv routes under studios/:studioId/scene-qc-confirmations', () => {
    const path = Reflect.getMetadata('path', StudioSceneQcConfirmationController);
    expect(path).toBe('studios/:studioId/scene-qc-confirmations');

    const reportPath = Reflect.getMetadata('path', controller.report);
    const reportCsvPath = Reflect.getMetadata('path', controller.reportCsv);
    expect(reportPath).toBe(':confirmationId/report');
    expect(reportCsvPath).toBe(':confirmationId/report.csv');
    expect(reportPath).not.toBe(reportCsvPath);
  });

  describe('confirm', () => {
    it('delegates to confirmDay with the studio uid, operational_date, and actor context', async () => {
      const confirmation = { id: 'scqcc_a', revision: 1 } as never;
      workflowService.confirmDay.mockResolvedValue(confirmation);

      const result = await controller.confirm(user, studioId, { operationalDate: '2026-08-01' } as never);

      expect(workflowService.confirmDay).toHaveBeenCalledWith(studioId, '2026-08-01', {
        actorExtId: 'ext_1',
        studioUid: studioId,
      });
      expect(result).toBe(confirmation);
    });
  });

  describe('report', () => {
    it('delegates to getReport with the studio and confirmation uid', async () => {
      const report = buildReport();
      reportService.getReport.mockResolvedValue(report as never);

      const result = await controller.report(studioId, 'scqcc_a');

      expect(reportService.getReport).toHaveBeenCalledWith(studioId, 'scqcc_a');
      expect(result).toBe(report);
    });
  });

  describe('reportCsv', () => {
    it('returns a raw CSV string and sets Content-Type and a dynamic Content-Disposition filename', async () => {
      const report = buildReport({
        shows: [
          {
            scheduled_start_time: '2026-08-01T07:00:00.000Z',
            show_id: 'show_1',
            show_name: 'Show One',
            client: { id: 'client_1', name: 'Client One' },
            platforms: [],
            result: 'PASS',
            reviewed_by: { id: 'user_reviewer', name: 'Reviewer' },
            reviewed_at: '2026-08-01T07:30:00.000Z',
            feedback: null,
            evidence_count: 1,
            scene_type: null,
            amended: false,
          },
        ],
      });
      reportService.getReport.mockResolvedValue(report as never);
      const setHeader = jest.fn();
      const res = { setHeader } as never;

      const csv = await controller.reportCsv(studioId, 'scqcc_a', res);

      expect(typeof csv).toBe('string');
      expect(csv.charCodeAt(0)).toBe(0xFEFF);
      expect(setHeader).toHaveBeenCalledWith('Content-Type', 'text/csv; charset=utf-8');
      expect(setHeader).toHaveBeenCalledWith(
        'Content-Disposition',
        'attachment; filename="scene-qc-report-2026-08-01-r3.csv"',
      );
    });

    it('carries no ZodSerializerDto metadata -- a bare string return must pass through untouched', () => {
      const dto = Reflect.getMetadata('ZOD_SERIALIZER_DTO_OPTIONS', StudioSceneQcConfirmationController.prototype.reportCsv);
      expect(dto).toBeUndefined();
    });
  });
});
