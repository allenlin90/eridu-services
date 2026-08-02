import { StudioShowIssueController } from './studio-show-issue.controller';

import type { AuthenticatedRequest, AuthenticatedUser } from '@/lib/auth/jwt-auth.guard';
import type { ShowIssueWorkflowService } from '@/show-issue-orchestration/show-issue-workflow.service';

describe('studioShowIssueController', () => {
  const buildController = () => {
    const service = {
      listShowIssues: jest.fn(),
      getShowIssue: jest.fn(),
      getShowIssueAudits: jest.fn(),
      createShowIssue: jest.fn(),
      updateShowIssue: jest.fn(),
      resolveShowIssue: jest.fn(),
      reopenShowIssue: jest.fn(),
      escalateShowIssue: jest.fn(),
    } as unknown as jest.Mocked<ShowIssueWorkflowService>;
    const controller = new StudioShowIssueController(service);
    return { controller, service };
  };

  const user = { ext_id: 'ext_1' } as AuthenticatedUser;
  const requestWithRole = (role: string) => ({ studioMembership: { role } }) as AuthenticatedRequest;

  it('lists show issues with pagination', async () => {
    const { controller, service } = buildController();
    service.listShowIssues.mockResolvedValue({ items: [{ id: 'issue_1' } as any], total: 1 });

    const query = { page: 1, limit: 10, skip: 0, take: 10, sort: 'desc' as const };
    const result = await controller.index('std_1', query as any);

    expect(service.listShowIssues).toHaveBeenCalledWith('std_1', query);
    expect(result.data).toEqual([{ id: 'issue_1' }]);
    expect(result.meta.total).toBe(1);
  });

  it('gets a single show issue', async () => {
    const { controller, service } = buildController();
    service.getShowIssue.mockResolvedValue({ id: 'issue_1' } as any);

    await expect(controller.show('std_1', 'issue_1')).resolves.toEqual({ id: 'issue_1' });
    expect(service.getShowIssue).toHaveBeenCalledWith('std_1', 'issue_1');
  });

  it('lists show issue audits with pagination', async () => {
    const { controller, service } = buildController();
    service.getShowIssueAudits.mockResolvedValue({ items: [{ id: 'aud_1' } as any], total: 1 });

    const result = await controller.audits('std_1', 'issue_1', { page: 2, limit: 5 });

    expect(service.getShowIssueAudits).toHaveBeenCalledWith('std_1', 'issue_1', { skip: 5, take: 5 });
    expect(result.data).toEqual([{ id: 'aud_1' }]);
  });

  it('creates a show issue with the acting user extId', async () => {
    const { controller, service } = buildController();
    service.createShowIssue.mockResolvedValue({ id: 'issue_1' } as any);
    const body = { showId: 'show_1', category: 'EQUIPMENT', severity: 'MEDIUM', title: 'Broken mic' } as any;

    await expect(controller.create('std_1', body, user)).resolves.toEqual({ id: 'issue_1' });
    expect(service.createShowIssue).toHaveBeenCalledWith('std_1', body, 'ext_1');
  });

  it('updates a show issue, passing the caller studio role through', async () => {
    const { controller, service } = buildController();
    service.updateShowIssue.mockResolvedValue({ id: 'issue_1' } as any);
    const body = { version: 1, severity: 'HIGH' } as any;

    await expect(
      controller.update('std_1', 'issue_1', body, user, requestWithRole('manager')),
    ).resolves.toEqual({ id: 'issue_1' });
    expect(service.updateShowIssue).toHaveBeenCalledWith('std_1', 'issue_1', body, 'ext_1', 'manager');
  });

  it('resolves a show issue, passing the caller studio role through', async () => {
    const { controller, service } = buildController();
    service.resolveShowIssue.mockResolvedValue({ id: 'issue_1' } as any);
    const body = { version: 1, resolutionCode: 'FIXED', resolutionNote: 'done' } as any;

    await expect(
      controller.resolve('std_1', 'issue_1', body, user, requestWithRole('member')),
    ).resolves.toEqual({ id: 'issue_1' });
    expect(service.resolveShowIssue).toHaveBeenCalledWith('std_1', 'issue_1', body, 'ext_1', 'member');
  });

  it('reopens a show issue', async () => {
    const { controller, service } = buildController();
    service.reopenShowIssue.mockResolvedValue({ id: 'issue_1' } as any);
    const body = { version: 1 } as any;

    await expect(controller.reopen('std_1', 'issue_1', body, user)).resolves.toEqual({ id: 'issue_1' });
    expect(service.reopenShowIssue).toHaveBeenCalledWith('std_1', 'issue_1', body, 'ext_1');
  });

  it('escalates a show issue', async () => {
    const { controller, service } = buildController();
    service.escalateShowIssue.mockResolvedValue({ id: 'issue_1' } as any);
    const body = { version: 1 } as any;

    await expect(controller.escalate('std_1', 'issue_1', body, user)).resolves.toEqual({ id: 'issue_1' });
    expect(service.escalateShowIssue).toHaveBeenCalledWith('std_1', 'issue_1', body, 'ext_1');
  });
});
