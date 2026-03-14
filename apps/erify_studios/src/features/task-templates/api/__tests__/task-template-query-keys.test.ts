import { describe, expect, it } from 'vitest';

import { taskTemplateQueryKeys } from '../task-template-query-keys';

describe('taskTemplateQueryKeys', () => {
  it('creates list-scoped keys', () => {
    expect(taskTemplateQueryKeys.listPrefix('std_1')).toEqual([
      'task-templates',
      'list',
      'std_1',
    ]);

    expect(
      taskTemplateQueryKeys.list('std_1', { search: 'camera' }),
    ).toEqual([
      'task-templates',
      'list',
      'std_1',
      { search: 'camera' },
    ]);
  });

  it('creates picker and detail keys', () => {
    expect(taskTemplateQueryKeys.allPickerPrefix('std_1')).toEqual([
      'task-templates',
      'list',
      'std_1',
      'all-picker',
    ]);

    expect(
      taskTemplateQueryKeys.allPicker('std_1', {
        search: '',
        pageSize: 100,
      }),
    ).toEqual([
      'task-templates',
      'list',
      'std_1',
      'all-picker',
      { search: '', pageSize: 100 },
    ]);

    expect(taskTemplateQueryKeys.detail('std_1', 'ttpl_1')).toEqual([
      'task-templates',
      'detail',
      'std_1',
      'ttpl_1',
    ]);
  });
});
