import { DndContext } from '@dnd-kit/core';
import { SortableContext } from '@dnd-kit/sortable';
import { render, screen } from '@testing-library/react';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import type { FieldItem } from '../schema';
import { SortableFieldItem } from '../sortable-field-item';

beforeAll(() => {
  const proto = window.HTMLElement.prototype;
  proto.hasPointerCapture = () => false;
  proto.setPointerCapture = () => {};
  proto.releasePointerCapture = () => {};
  proto.scrollIntoView = () => {};
});

function makeItem(overrides: Partial<FieldItem> = {}): FieldItem {
  return {
    id: 'fld_test000001',
    key: 'field_1',
    type: 'text',
    label: 'Question',
    required: true,
    ...overrides,
  } as FieldItem;
}

function renderItem(item: FieldItem) {
  return render(
    <DndContext>
      <SortableContext items={[item.id]}>
        <SortableFieldItem item={item} onUpdate={vi.fn()} onRemove={vi.fn()} />
      </SortableContext>
    </DndContext>,
  );
}

describe('sortableFieldItem -- Scene QC badge', () => {
  it('does not render a Scene QC badge for a field without evidence_purpose', () => {
    renderItem(makeItem({ type: 'file', validation: { accept: 'image/*' } }));
    expect(screen.queryByText('Scene QC')).not.toBeInTheDocument();
  });

  it('renders a Scene QC badge for a field marked evidence_purpose: scene_qc', () => {
    renderItem(makeItem({ type: 'file', evidence_purpose: 'scene_qc', validation: { accept: 'image/*' } }));
    expect(screen.getByText('Scene QC')).toBeInTheDocument();
  });
});
