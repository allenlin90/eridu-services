import { describe, expect, it } from 'vitest';

import type { TaskWithRelationsDto } from '@eridu/api-types/task-management';

import {
  getTaskQcEvidence,
  getTaskQcEvidenceUrlsFromContent,
  getTaskQcMetrics,
} from '@/features/tasks/lib/task-qc-evidence';

function createTask(content: Record<string, unknown>): TaskWithRelationsDto {
  return {
    content,
    snapshot: {
      version: 1,
      schema: {
        items: [
          { id: 'evidence', key: 'evidence', type: 'file', label: 'Final screenshot', validation: { accept: 'image/*' } },
          { id: 'gmv', key: 'gmv', type: 'number', label: 'GMV' },
          { id: 'ctr', key: 'ctr', type: 'number', label: 'Platform CTR' },
        ],
      },
    },
    hydration_context: { creators: [], platforms: [] },
  } as unknown as TaskWithRelationsDto;
}

describe('task QC evidence', () => {
  it('extracts image evidence and available submitted metrics from the frozen schema', () => {
    const task = createTask({
      evidence: 'https://assets.example.com/final.webp',
      gmv: 12500,
      ctr: '4.2%',
    });

    expect(getTaskQcEvidence(task)).toEqual([{
      key: 'evidence',
      label: 'Final screenshot',
      url: 'https://assets.example.com/final.webp',
    }]);
    expect(getTaskQcMetrics(task)).toEqual([
      { key: 'gmv', label: 'GMV', value: '12500' },
      { key: 'ctr', label: 'CTR', value: '4.2%' },
    ]);
  });

  it('finds nested image URLs for compact list previews and rejects unsafe URLs', () => {
    expect(getTaskQcEvidenceUrlsFromContent({
      gallery: ['javascript:alert(1)', { url: 'https://assets.example.com/qc.png?version=2' }],
    })).toEqual(['https://assets.example.com/qc.png?version=2']);
  });
});
