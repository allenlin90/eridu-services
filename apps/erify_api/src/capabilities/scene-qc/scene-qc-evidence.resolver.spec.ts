import type { TransactionHost } from '@nestjs-cls/transactional';
import type { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';

import { SceneQcEvidenceResolver } from './scene-qc-evidence.resolver';

import type { StorageService } from '@/lib/storage/storage.service';

type MockTask = {
  id: bigint;
  uid: string;
  version: number;
  content: Record<string, unknown>;
  targets: Array<{ showId: bigint | null }>;
  snapshot: { sceneQcEvidenceRefs: Array<{ fieldKey: string; label: string }> } | null;
};

describe('sceneQcEvidenceResolver', () => {
  let findManyMock: jest.Mock;
  let deriveObjectKeyMock: jest.Mock;
  let resolver: SceneQcEvidenceResolver;

  function setTasks(tasks: MockTask[]) {
    findManyMock.mockResolvedValue(tasks);
  }

  beforeEach(() => {
    findManyMock = jest.fn().mockResolvedValue([]);
    deriveObjectKeyMock = jest.fn().mockReturnValue('derived/object/key.png');
    const txHost = {
      tx: { task: { findMany: findManyMock } },
    } as unknown as TransactionHost<TransactionalAdapterPrisma>;
    const storageService = {
      deriveObjectKeyFromPublicUrl: deriveObjectKeyMock,
    } as unknown as StorageService;
    resolver = new SceneQcEvidenceResolver(txHost, storageService);
  });

  it('returns an empty-array entry (not a missing key) for every requested Show with no evidence', async () => {
    const result = await resolver.resolveForShows([1n, 2n]);

    expect(result.get(1n)).toEqual([]);
    expect(result.get(2n)).toEqual([]);
    expect(result.has(1n)).toBe(true);
    expect(result.has(2n)).toBe(true);
  });

  it('returns an empty Map immediately for an empty showIds input', async () => {
    const result = await resolver.resolveForShows([]);
    expect(result.size).toBe(0);
    expect(findManyMock).not.toHaveBeenCalled();
  });

  it('resolves every designated image and no undesignated image', async () => {
    setTasks([
      {
        id: 1n,
        uid: 'task_a',
        version: 3,
        content: {
          screenshot_field: 'https://cdn.example.com/a.png',
          untracked_field: 'https://cdn.example.com/should-not-appear.png',
        },
        targets: [{ showId: 10n }],
        snapshot: {
          sceneQcEvidenceRefs: [{ fieldKey: 'screenshot_field', label: 'Screenshot' }],
        },
      },
    ]);

    const result = await resolver.resolveForShows([10n]);
    const evidence = result.get(10n)!;

    expect(evidence).toHaveLength(1);
    expect(evidence[0]).toMatchObject({
      sourceTaskId: 1n,
      sourceTaskUid: 'task_a',
      sourceTaskVersion: 3,
      sourceFieldKey: 'screenshot_field',
      sourceLabel: 'Screenshot',
      fileUrl: 'https://cdn.example.com/a.png',
    });
  });

  it('never emits an undesignated field even when it holds a safe remote URL', async () => {
    setTasks([
      {
        id: 1n,
        uid: 'task_a',
        version: 1,
        content: { not_designated: 'https://cdn.example.com/sneaky.png' },
        targets: [{ showId: 10n }],
        snapshot: { sceneQcEvidenceRefs: [] },
      },
    ]);

    const result = await resolver.resolveForShows([10n]);
    expect(result.get(10n)).toEqual([]);
  });

  it('rejects a non-string or unsafe-protocol content value', async () => {
    setTasks([
      {
        id: 1n,
        uid: 'task_a',
        version: 1,
        content: { field_a: 123, field_b: 'javascript:alert(1)' },
        targets: [{ showId: 10n }],
        snapshot: {
          sceneQcEvidenceRefs: [
            { fieldKey: 'field_a', label: 'A' },
            { fieldKey: 'field_b', label: 'B' },
          ],
        },
      },
    ]);

    const result = await resolver.resolveForShows([10n]);
    expect(result.get(10n)).toEqual([]);
  });

  it('derives objectKey via StorageService for a legitimate R2 URL', async () => {
    setTasks([
      {
        id: 1n,
        uid: 'task_a',
        version: 1,
        content: { field_a: 'https://cdn.example.com/a.png' },
        targets: [{ showId: 10n }],
        snapshot: { sceneQcEvidenceRefs: [{ fieldKey: 'field_a', label: 'A' }] },
      },
    ]);

    const result = await resolver.resolveForShows([10n]);
    expect(result.get(10n)![0].objectKey).toBe('derived/object/key.png');
    expect(deriveObjectKeyMock).toHaveBeenCalledWith('https://cdn.example.com/a.png');
  });

  it('excludes a designated value whose object key cannot be derived (foreign/non-R2 URL) rather than pinning it unverified', async () => {
    deriveObjectKeyMock.mockReturnValueOnce(null);
    setTasks([
      {
        id: 1n,
        uid: 'task_a',
        version: 1,
        content: { field_a: 'https://not-our-storage.example.com/a.png' },
        targets: [{ showId: 10n }],
        snapshot: { sceneQcEvidenceRefs: [{ fieldKey: 'field_a', label: 'A' }] },
      },
    ]);

    const result = await resolver.resolveForShows([10n]);
    expect(result.get(10n)).toEqual([]);
  });

  it('orders evidence deterministically by (sourceTaskUid ASC, sourceFieldKey ASC)', async () => {
    setTasks([
      {
        id: 2n,
        uid: 'task_b',
        version: 1,
        content: { field_a: 'https://cdn.example.com/b-a.png' },
        targets: [{ showId: 10n }],
        snapshot: { sceneQcEvidenceRefs: [{ fieldKey: 'field_a', label: 'B-A' }] },
      },
      {
        id: 1n,
        uid: 'task_a',
        version: 1,
        content: {
          field_b: 'https://cdn.example.com/a-b.png',
          field_a: 'https://cdn.example.com/a-a.png',
        },
        targets: [{ showId: 10n }],
        snapshot: {
          sceneQcEvidenceRefs: [
            { fieldKey: 'field_b', label: 'A-B' },
            { fieldKey: 'field_a', label: 'A-A' },
          ],
        },
      },
    ]);

    const result = await resolver.resolveForShows([10n]);
    const labels = result.get(10n)!.map((item) => item.sourceLabel);
    expect(labels).toEqual(['A-A', 'A-B', 'B-A']);
  });

  it('dedupes by fileUrl within a Show when the same asset is bound to two fields', async () => {
    setTasks([
      {
        id: 1n,
        uid: 'task_a',
        version: 1,
        content: {
          field_a: 'https://cdn.example.com/same.png',
          field_b: 'https://cdn.example.com/same.png',
        },
        targets: [{ showId: 10n }],
        snapshot: {
          sceneQcEvidenceRefs: [
            { fieldKey: 'field_a', label: 'A' },
            { fieldKey: 'field_b', label: 'B' },
          ],
        },
      },
    ]);

    const result = await resolver.resolveForShows([10n]);
    expect(result.get(10n)).toHaveLength(1);
  });

  it('associates evidence only to the Shows a Task actually targets among the requested set', async () => {
    setTasks([
      {
        id: 1n,
        uid: 'task_a',
        version: 1,
        content: { field_a: 'https://cdn.example.com/a.png' },
        targets: [{ showId: 10n }],
        snapshot: { sceneQcEvidenceRefs: [{ fieldKey: 'field_a', label: 'A' }] },
      },
    ]);

    const result = await resolver.resolveForShows([10n, 20n]);
    expect(result.get(10n)).toHaveLength(1);
    expect(result.get(20n)).toEqual([]);
  });

  it('queries with deletedAt: null, a required snapshotId, and a SHOW-target scope for the requested Shows', async () => {
    await resolver.resolveForShows([10n]);

    const call = findManyMock.mock.calls[0][0];
    expect(call.where.deletedAt).toBeNull();
    expect(call.where.snapshotId).toEqual({ not: null });
    expect(call.where.targets.some).toMatchObject({
      targetType: 'SHOW',
      showId: { in: [10n] },
      deletedAt: null,
    });
  });
});
