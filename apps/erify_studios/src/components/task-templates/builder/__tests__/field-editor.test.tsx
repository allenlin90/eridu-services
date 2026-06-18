import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import { FieldEditor } from '../field-editor';
import type { FieldItem } from '../schema';

// happy-dom does not implement the pointer-capture / scroll APIs that Radix
// Select relies on to open its listbox. Polyfill them locally so the
// Select-driven characterizations below can exercise the real onValueChange path.
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

describe('fieldEditor', () => {
  it('emits a label update through onUpdate', async () => {
    const user = userEvent.setup();
    const onUpdate = vi.fn();
    render(<FieldEditor item={makeItem({ label: '' })} onUpdate={onUpdate} />);

    await user.type(screen.getByLabelText('Label'), 'A');

    // onUpdate is a mock that does not feed the value back, so each keystroke
    // replaces the controlled empty value with the single typed character.
    expect(onUpdate).toHaveBeenCalledWith({ label: 'A' });
  });

  it('resets default value and clears numeric/condition validation when the type changes', async () => {
    const user = userEvent.setup();
    const onUpdate = vi.fn();
    render(
      <FieldEditor
        item={makeItem({ type: 'number', validation: { min: 1, max: 5, require_reason: [] } })}
        onUpdate={onUpdate}
      />,
    );

    await user.click(screen.getByRole('combobox', { name: 'Type' }));
    await user.click(await screen.findByRole('option', { name: 'Text' }));

    expect(onUpdate).toHaveBeenCalledWith(expect.objectContaining({
      type: 'text',
      default_value: '',
      validation: { require_reason: undefined },
    }));
  });

  it('binds a compatible system fact, switching type and resetting validation', async () => {
    const user = userEvent.setup();
    const onUpdate = vi.fn();
    render(<FieldEditor item={makeItem({ type: 'text' })} onUpdate={onUpdate} />);

    await user.click(screen.getByRole('combobox', { name: 'Auto-fill record field' }));
    await user.click(await screen.findByRole('option', { name: /Show actual start time/ }));

    expect(onUpdate).toHaveBeenCalledWith({
      system_fact_key: 'show_actual_start_time',
      type: 'datetime',
      default_value: '',
      validation: {},
    });
  });

  it('forces an on-true explanation rule when binding the attendance-missing fact', async () => {
    const user = userEvent.setup();
    const onUpdate = vi.fn();
    render(<FieldEditor item={makeItem({ type: 'text' })} onUpdate={onUpdate} />);

    await user.click(screen.getByRole('combobox', { name: 'Auto-fill record field' }));
    await user.click(await screen.findByRole('option', { name: 'Creator attendance missing' }));

    expect(onUpdate).toHaveBeenCalledWith({
      system_fact_key: 'creator_attendance_missing',
      type: 'checkbox',
      default_value: '',
      validation: { require_reason: 'on-true' },
    });
  });

  it('locks type and auto-fill controls for shared fields', () => {
    const onUpdate = vi.fn();
    render(
      <FieldEditor
        item={makeItem({ type: 'number', key: 'gmv', shared_field_key: 'gmv' })}
        onUpdate={onUpdate}
      />,
    );

    expect(screen.getByRole('combobox', { name: 'Type' })).toBeDisabled();
    expect(screen.getByRole('combobox', { name: 'Auto-fill record field' })).toBeDisabled();
    expect(screen.getByText('Shared-field type is locked by studio settings.')).toBeInTheDocument();
  });

  it('normalizes an option label into a snake_case value', async () => {
    const user = userEvent.setup();
    const onUpdate = vi.fn();
    render(
      <FieldEditor
        item={makeItem({ type: 'select', options: [{ id: 'opt_1', label: '', value: '' }] })}
        onUpdate={onUpdate}
      />,
    );

    await user.type(screen.getByPlaceholderText('Label'), 'A');

    expect(onUpdate).toHaveBeenCalledWith({
      options: [{ id: 'opt_1', label: 'A', value: 'a' }],
    });
  });

  it('emits a string require_reason for text fields', async () => {
    const user = userEvent.setup();
    const onUpdate = vi.fn();
    render(<FieldEditor item={makeItem({ type: 'text' })} onUpdate={onUpdate} />);

    const explanationGroup = screen.getByText('Require Explanation').closest('div') as HTMLElement;
    await user.click(within(explanationGroup).getByRole('combobox'));
    await user.click(await screen.findByRole('option', { name: 'Always' }));

    expect(onUpdate).toHaveBeenCalledWith({
      validation: { require_reason: 'always' },
    });
  });
});
