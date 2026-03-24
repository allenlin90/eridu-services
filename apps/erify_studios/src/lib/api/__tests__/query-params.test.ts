import axios from 'axios';
import { describe, expect, it } from 'vitest';

import { apiQueryParamsSerializer } from '../query-params';

describe('apiQueryParamsSerializer', () => {
  it('serializes array params as repeated keys without [] suffixes', () => {
    const client = axios.create({
      baseURL: 'https://example.test',
      paramsSerializer: apiQueryParamsSerializer,
    });

    const uri = client.getUri({
      url: '/studios/std_123/task-reports/preflight',
      params: {
        date_from: '2026-03-01',
        date_to: '2026-03-31',
        client_id: ['client_1', 'client_2'],
        submitted_statuses: ['REVIEW', 'COMPLETED'],
      },
    });

    expect(uri).toContain('client_id=client_1');
    expect(uri).toContain('client_id=client_2');
    expect(uri).toContain('submitted_statuses=REVIEW');
    expect(uri).toContain('submitted_statuses=COMPLETED');
    expect(uri).not.toContain('client_id%5B%5D');
    expect(uri).not.toContain('submitted_statuses%5B%5D');
  });
});
