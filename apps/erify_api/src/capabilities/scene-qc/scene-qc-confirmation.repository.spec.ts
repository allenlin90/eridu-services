import { SceneQcConfirmationRepository } from './scene-qc-confirmation.repository';

function buildTxHost(overrides: { isTransactionActive?: boolean; tx?: Record<string, unknown> } = {}) {
  const executeRaw = jest.fn().mockResolvedValue(undefined);
  const tx = {
    $executeRaw: executeRaw,
    sceneQcDailyConfirmation: {
      findFirst: jest.fn(),
      aggregate: jest.fn(),
      count: jest.fn(),
      groupBy: jest.fn(),
      create: jest.fn(),
    },
    sceneQcDailyConfirmationItem: {
      findMany: jest.fn(),
    },
    sceneQcReview: {
      updateMany: jest.fn(),
    },
    ...overrides.tx,
  };
  const txHost = {
    isTransactionActive: jest.fn().mockReturnValue(overrides.isTransactionActive ?? true),
    tx,
  };
  return { txHost, tx, executeRaw };
}

describe('sceneQcConfirmationRepository.acquireDayLock', () => {
  it('throws before issuing any query when no transaction is active', async () => {
    const { txHost, executeRaw } = buildTxHost({ isTransactionActive: false });
    const repository = new SceneQcConfirmationRepository(txHost as never);

    await expect(repository.acquireDayLock({ studioUid: 'std_1', operationalDate: '2026-08-01' })).rejects.toMatchObject({
      status: 500,
    });
    expect(executeRaw).not.toHaveBeenCalled();
  });

  it('issues pg_advisory_xact_lock with the normalized studio+date lock key when a transaction is active', async () => {
    const { txHost, executeRaw } = buildTxHost({ isTransactionActive: true });
    const repository = new SceneQcConfirmationRepository(txHost as never);

    await repository.acquireDayLock({ studioUid: 'std_1', operationalDate: '2026-08-01' });

    expect(executeRaw).toHaveBeenCalledTimes(1);
    const [strings, lockKey] = executeRaw.mock.calls[0] as [TemplateStringsArray, string];
    expect(strings.join('?')).toBe('SELECT pg_advisory_xact_lock(hashtextextended(?, 0))');
    expect(lockKey).toBe('scene-qc-confirmation:std_1:2026-08-01');
  });
});

describe('sceneQcConfirmationRepository.findMaxRevision', () => {
  it('returns 0 when no confirmation exists yet for the day', async () => {
    const { txHost, tx } = buildTxHost();
    (tx.sceneQcDailyConfirmation.aggregate as jest.Mock).mockResolvedValue({ _max: { revision: null } });
    const repository = new SceneQcConfirmationRepository(txHost as never);

    const max = await repository.findMaxRevision({ studioUid: 'std_1', operationalDate: new Date('2026-08-01') });

    expect(max).toBe(0);
  });
});

describe('sceneQcConfirmationRepository.markReviewsConfirmed', () => {
  it('predicates the update on confirmedAt: null so a reconfirm never rewrites an earlier stamp', async () => {
    const { txHost, tx } = buildTxHost();
    (tx.sceneQcReview.updateMany as jest.Mock).mockResolvedValue({ count: 2 });
    const repository = new SceneQcConfirmationRepository(txHost as never);

    const confirmedAt = new Date('2026-08-01T06:00:00.000Z');
    const count = await repository.markReviewsConfirmed({ reviewIds: [1n, 2n], confirmedAt });

    expect(count).toBe(2);
    expect(tx.sceneQcReview.updateMany).toHaveBeenCalledWith({
      where: { id: { in: [1n, 2n] }, confirmedAt: null },
      data: { confirmedAt },
    });
  });

  it('returns 0 without querying when reviewIds is empty', async () => {
    const { txHost, tx } = buildTxHost();
    const repository = new SceneQcConfirmationRepository(txHost as never);

    const count = await repository.markReviewsConfirmed({ reviewIds: [], confirmedAt: new Date() });

    expect(count).toBe(0);
    expect(tx.sceneQcReview.updateMany).not.toHaveBeenCalled();
  });
});

describe('sceneQcConfirmationRepository.findConfirmationRefsForReviews', () => {
  it('marks the ref SUPERSEDED when a later revision exists for the same (studio, operational date)', async () => {
    const { txHost, tx } = buildTxHost();
    const operationalDate = new Date('2026-08-01T00:00:00.000Z');
    (tx.sceneQcDailyConfirmationItem.findMany as jest.Mock).mockResolvedValue([
      { reviewId: 10n, confirmation: { id: 1n, uid: 'scqcc_a', revision: 1, studioId: 5n, operationalDate } },
    ]);
    (tx.sceneQcDailyConfirmation.groupBy as jest.Mock).mockResolvedValue([
      { studioId: 5n, operationalDate, _max: { revision: 2 } },
    ]);
    const repository = new SceneQcConfirmationRepository(txHost as never);

    const refs = await repository.findConfirmationRefsForReviews([10n]);

    expect(refs.get(10n)).toEqual({
      confirmationId: 1n,
      confirmationUid: 'scqcc_a',
      revision: 1,
      isLatestRevisionForDay: false,
    });
  });

  it('marks the ref as the latest revision when no newer revision exists for the day', async () => {
    const { txHost, tx } = buildTxHost();
    const operationalDate = new Date('2026-08-01T00:00:00.000Z');
    (tx.sceneQcDailyConfirmationItem.findMany as jest.Mock).mockResolvedValue([
      { reviewId: 10n, confirmation: { id: 1n, uid: 'scqcc_a', revision: 2, studioId: 5n, operationalDate } },
    ]);
    (tx.sceneQcDailyConfirmation.groupBy as jest.Mock).mockResolvedValue([
      { studioId: 5n, operationalDate, _max: { revision: 2 } },
    ]);
    const repository = new SceneQcConfirmationRepository(txHost as never);

    const refs = await repository.findConfirmationRefsForReviews([10n]);

    expect(refs.get(10n)?.isLatestRevisionForDay).toBe(true);
  });

  it('returns an empty map without querying when reviewIds is empty', async () => {
    const { txHost, tx } = buildTxHost();
    const repository = new SceneQcConfirmationRepository(txHost as never);

    const refs = await repository.findConfirmationRefsForReviews([]);

    expect(refs.size).toBe(0);
    expect(tx.sceneQcDailyConfirmationItem.findMany).not.toHaveBeenCalled();
  });
});
