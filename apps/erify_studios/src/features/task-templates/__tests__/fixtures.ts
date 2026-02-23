import type { TaskTemplateDto } from '@eridu/api-types/task-management';

const BASE_TEMPLATE: Omit<TaskTemplateDto, 'id' | 'name' | 'description' | 'version'> = {
  is_active: true,
  task_type: 'SETUP',
  current_schema: { items: [] },
  created_at: '2024-01-01T00:00:00.000Z',
  updated_at: '2024-01-15T00:00:00.000Z',
};

export function generateMockTemplates(count: number): TaskTemplateDto[] {
  return Array.from({ length: count }).map((_, i) => ({
    ...BASE_TEMPLATE,
    id: `ttpl_mock_${i + 1}`,
    name: `Task Template ${i + 1}`,
    description: `Description for task template ${i + 1}. This is a mock description to test layout and rendering.`,
    is_active: i % 5 !== 0, // Every 5th item is inactive
    version: Math.floor(Math.random() * 5) + 1,
    // Add some random variation to dates for sorting tests
    updated_at: new Date(Date.now() - Math.random() * 10000000000).toISOString(),
  }));
}
