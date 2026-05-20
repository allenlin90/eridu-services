import { describe, expect, it } from 'vitest';

import type { BuilderTemplateSchemaType, FieldItem } from '../schema';
import {
  addMechanic,
  assignMechanicToLoop,
  deleteMechanic,
  detectMechanicDrift,
  getMechanicAssignments,
  getMechanics,
  migrateMechanicLibrary,
  renameMechanic,
  unassignMechanicFromLoop,
} from '../task-template-helpers';

function makeCheckbox(id: string, group: string, label: string, extras: Partial<FieldItem> = {}): FieldItem {
  return {
    id,
    key: `key_${id}`,
    type: 'checkbox',
    label,
    required: true,
    group,
    ...extras,
  } as FieldItem;
}

function makeTemplate(items: FieldItem[], loopIds: string[] = []): BuilderTemplateSchemaType {
  return {
    name: 't',
    task_type: 'ACTIVE',
    items,
    metadata: {
      loops: loopIds.map((id, i) => ({ id, name: `Loop ${i + 1}`, durationMin: 15 })),
    },
  } as BuilderTemplateSchemaType;
}

describe('migrateMechanicLibrary', () => {
  it('groups checkbox items by trimmed lowercase label', () => {
    const tpl = makeTemplate([
      makeCheckbox('a', 'l1', 'BOGO buy 1 get 1'),
      makeCheckbox('b', 'l2', 'bogo buy 1 get 1'),
      makeCheckbox('c', 'l3', 'Shirt A'),
    ], ['l1', 'l2', 'l3']);

    const next = migrateMechanicLibrary(tpl);
    const mechanics = getMechanics(next);
    const assignments = getMechanicAssignments(next);

    expect(mechanics).toHaveLength(2);
    expect(assignments.a).toBeDefined();
    expect(assignments.b).toBe(assignments.a);
    expect(assignments.c).not.toBe(assignments.a);
  });

  it('is idempotent: skips if mechanics already exist', () => {
    const tpl = makeTemplate([makeCheckbox('a', 'l1', 'BOGO')], ['l1']);
    const once = migrateMechanicLibrary(tpl);
    const twice = migrateMechanicLibrary(once);
    expect(twice).toBe(once);
  });

  it('does not touch shared fields or non-checkbox items', () => {
    const tpl = makeTemplate([
      makeCheckbox('a', 'l1', 'BOGO'),
      makeCheckbox('b', 'l1', 'Shared one', { standard: true }),
      { id: 'c', key: 'note', type: 'textarea', label: 'Notes', required: false, group: 'l1' } as FieldItem,
    ], ['l1']);

    const next = migrateMechanicLibrary(tpl);
    const assignments = getMechanicAssignments(next);

    expect(Object.keys(assignments)).toEqual(['a']);
  });

  it('returns the original template when there is nothing to migrate', () => {
    const tpl = makeTemplate([], []);
    expect(migrateMechanicLibrary(tpl)).toBe(tpl);
  });
});

describe('renameMechanic', () => {
  it('updates the library label and every linked item label', () => {
    let tpl = makeTemplate([
      makeCheckbox('a', 'l1', 'BOGO'),
      makeCheckbox('b', 'l2', 'BOGO'),
    ], ['l1', 'l2']);
    tpl = migrateMechanicLibrary(tpl);
    const mechanicId = getMechanics(tpl)[0]!.id;

    const next = renameMechanic(tpl, mechanicId, 'BOGO buy 1 get 1');

    expect(getMechanics(next)[0]!.label).toBe('BOGO buy 1 get 1');
    expect(next.items.every((item) => item.label === 'BOGO buy 1 get 1')).toBe(true);
  });
});

describe('assignMechanicToLoop / unassignMechanicFromLoop', () => {
  it('toggles a checkbox FieldItem into and out of a loop', () => {
    let tpl = makeTemplate([], ['l1']);
    const added = addMechanic(tpl, 'Free ship');
    tpl = added.template;

    tpl = assignMechanicToLoop(tpl, added.mechanic.id, 'l1');
    expect(tpl.items).toHaveLength(1);
    expect(tpl.items[0]!.group).toBe('l1');
    expect(tpl.items[0]!.label).toBe('Free ship');

    tpl = unassignMechanicFromLoop(tpl, added.mechanic.id, 'l1');
    expect(tpl.items).toHaveLength(0);
    expect(Object.keys(getMechanicAssignments(tpl))).toHaveLength(0);
  });

  it('is idempotent: re-assigning does not create duplicates', () => {
    let tpl = makeTemplate([], ['l1']);
    const added = addMechanic(tpl, 'Free ship');
    tpl = added.template;
    tpl = assignMechanicToLoop(tpl, added.mechanic.id, 'l1');
    tpl = assignMechanicToLoop(tpl, added.mechanic.id, 'l1');
    expect(tpl.items).toHaveLength(1);
  });
});

describe('deleteMechanic', () => {
  it('cascades: removes the mechanic and every linked checkbox FieldItem', () => {
    let tpl = makeTemplate([
      makeCheckbox('a', 'l1', 'BOGO'),
      makeCheckbox('b', 'l2', 'BOGO'),
      makeCheckbox('c', 'l3', 'Shirt A'),
    ], ['l1', 'l2', 'l3']);
    tpl = migrateMechanicLibrary(tpl);
    const bogoId = getMechanics(tpl).find((m) => m.label === 'BOGO')!.id;

    const next = deleteMechanic(tpl, bogoId);

    expect(getMechanics(next).find((m) => m.label === 'BOGO')).toBeUndefined();
    expect(next.items.find((item) => item.id === 'a')).toBeUndefined();
    expect(next.items.find((item) => item.id === 'b')).toBeUndefined();
    expect(next.items.find((item) => item.id === 'c')).toBeDefined();
  });
});

describe('detectMechanicDrift', () => {
  it('flags mechanics whose linked items have drifted labels', () => {
    let tpl = makeTemplate([
      makeCheckbox('a', 'l1', 'BOGO'),
      makeCheckbox('b', 'l2', 'BOGO'),
    ], ['l1', 'l2']);
    tpl = migrateMechanicLibrary(tpl);

    // Simulate a Cards-view edit on item `b` that drifts from the library label.
    tpl = {
      ...tpl,
      items: tpl.items.map((item) => (item.id === 'b' ? { ...item, label: 'BOGO: buy one get one free' } : item)),
    };

    const drifted = detectMechanicDrift(tpl);
    expect(drifted.size).toBe(1);
  });
});
