import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import { FieldEditor } from '../field-editor';
import type { FieldItem } from '../schema';
import { isImageOnlyAcceptRule } from '../schema';

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

  describe('scene QC evidence toggle', () => {
    it('does not render the evidence toggle for a non-file field', () => {
      render(<FieldEditor item={makeItem({ type: 'text' })} onUpdate={vi.fn()} />);
      expect(screen.queryByText('Use as Scene QC evidence')).not.toBeInTheDocument();
    });

    it('renders the evidence toggle, unchecked, for a file field with an image-only accept rule', () => {
      render(
        <FieldEditor
          item={makeItem({ type: 'file', validation: { accept: 'image/*' } })}
          onUpdate={vi.fn()}
        />,
      );
      const checkbox = screen.getByRole('checkbox', { name: /Use as Scene QC evidence/ });
      expect(checkbox).not.toBeChecked();
      expect(checkbox).toBeEnabled();
      expect(screen.getByText(/Enable only for the screenshot that Scene QC reviewers should inspect/i)).toBeInTheDocument();
    });

    it('renders checked when the field already carries evidence_purpose: scene_qc', () => {
      render(
        <FieldEditor
          item={makeItem({ type: 'file', evidence_purpose: 'scene_qc', validation: { accept: 'image/*' } })}
          onUpdate={vi.fn()}
        />,
      );
      expect(screen.getByRole('checkbox', { name: /Use as Scene QC evidence/ })).toBeChecked();
      expect(screen.getByText('Shared with Scene QC')).toBeInTheDocument();
      expect(screen.getByText(/Manager Review approval is not required/i)).toBeInTheDocument();
    });

    it('disables the toggle for a mechanic field, with the mechanic-specific reason', () => {
      render(
        <FieldEditor
          item={makeItem({
            type: 'file',
            validation: { accept: 'image/*' },
            mechanic_ref: { client_id: 'client_1', mechanic_id: 'cmech_1', content_revision: 1 },
          })}
          onUpdate={vi.fn()}
        />,
      );
      expect(screen.getByRole('checkbox', { name: /Use as Scene QC evidence/ })).toBeDisabled();
      expect(screen.getByText('Mechanic fields cannot be Scene QC evidence.')).toBeInTheDocument();
    });

    it('disables the toggle when the accept rule is not image-only, with the accept-specific reason', () => {
      render(
        <FieldEditor
          item={makeItem({ type: 'file', validation: { accept: 'image/*,.pdf' } })}
          onUpdate={vi.fn()}
        />,
      );
      expect(screen.getByRole('checkbox', { name: /Use as Scene QC evidence/ })).toBeDisabled();
      expect(screen.getByText('Select image-only file types below to allow Scene QC evidence.')).toBeInTheDocument();
    });

    it('turns evidence_purpose on when the toggle is clicked', async () => {
      const user = userEvent.setup();
      const onUpdate = vi.fn();
      render(
        <FieldEditor
          item={makeItem({ type: 'file', validation: { accept: 'image/*' } })}
          onUpdate={onUpdate}
        />,
      );

      await user.click(screen.getByRole('checkbox', { name: /Use as Scene QC evidence/ }));

      expect(onUpdate).toHaveBeenCalledWith({ evidence_purpose: 'scene_qc' });
    });

    it('clears evidence_purpose when the field type changes away from file', async () => {
      const user = userEvent.setup();
      const onUpdate = vi.fn();
      render(
        <FieldEditor
          item={makeItem({ type: 'file', evidence_purpose: 'scene_qc', validation: { accept: 'image/*' } })}
          onUpdate={onUpdate}
        />,
      );

      await user.click(screen.getByRole('combobox', { name: 'Type' }));
      await user.click(await screen.findByRole('option', { name: 'Text' }));

      expect(onUpdate).toHaveBeenCalledWith(expect.objectContaining({
        type: 'text',
        evidence_purpose: undefined,
      }));
    });

    it('clears evidence_purpose when the accept rule stops being image-only', async () => {
      const user = userEvent.setup();
      const onUpdate = vi.fn();
      render(
        <FieldEditor
          item={makeItem({ type: 'file', evidence_purpose: 'scene_qc', validation: { accept: 'image/*' } })}
          onUpdate={onUpdate}
        />,
      );

      const acceptGroup = screen.getByText('Allowed File Types').closest('div') as HTMLElement;
      await user.click(within(acceptGroup).getByRole('combobox'));
      // Deselecting the only selected option ("Image") empties `accept`,
      // which is no longer an image-only rule.
      await user.click(await screen.findByRole('option', { name: 'Image' }));

      expect(onUpdate).toHaveBeenCalledWith({
        validation: { accept: undefined },
        evidence_purpose: undefined,
      });
    });

    it('the client-side image-only-accept check agrees with the shared schema rule', () => {
      expect(isImageOnlyAcceptRule('image/*')).toBe(true);
      expect(isImageOnlyAcceptRule('image/*,.pdf')).toBe(false);
      expect(isImageOnlyAcceptRule(undefined)).toBe(false);
    });
  });
});
