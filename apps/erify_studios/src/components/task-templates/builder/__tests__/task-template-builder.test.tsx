import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import type { BuilderTemplateSchemaType } from '../schema';
import { TaskTemplateBuilder } from '../task-template-builder';

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, ...props }: any) => <a {...props}>{children}</a>,
}));

vi.mock('@/lib/hooks/use-studio-access', () => ({
  useStudioAccess: () => ({ hasAccess: () => false }),
}));

const mockUseIsMobile = vi.fn(() => false);
vi.mock('@eridu/ui/hooks/use-is-mobile', () => ({
  useIsMobile: () => mockUseIsMobile(),
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const mockMechanics = [
  {
    id: 'cmech_active',
    client_id: 'client_abc',
    title: 'Speaking Rule Active',
    instruction_label: 'Product Promo Active',
    instruction_body: 'Talk about product active for 5 minutes.',
    status: 'active',
    version: 1,
    content_revision: 2,
    metadata: {},
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'cmech_retired',
    client_id: 'client_abc',
    title: 'Speaking Rule Retired',
    instruction_label: 'Product Promo Retired',
    instruction_body: 'Talk about product retired.',
    status: 'retired',
    version: 1,
    content_revision: 1,
    metadata: {},
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'cmech_superseded',
    client_id: 'client_abc',
    title: 'Speaking Rule Superseded',
    instruction_label: 'Product Promo Superseded (New)',
    instruction_body: 'Talk about product superseded (new instructions).',
    status: 'active',
    version: 1,
    content_revision: 3,
    metadata: {},
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

const mockUseClientMechanicsQuery = vi.fn(() => ({
  data: { data: mockMechanics },
  isLoading: false,
}));
vi.mock('@/features/client-mechanics/api/get-client-mechanics', () => ({
  useClientMechanicsQuery: () => mockUseClientMechanicsQuery(),
}));

const v2LoopTemplate: BuilderTemplateSchemaType = {
  name: 'V2 moderation template',
  description: '',
  task_type: 'ACTIVE',
  schema_version: 2,
  schema_engine: 'task_template_v2',
  content_key_strategy: 'field_id',
  report_projection_strategy: 'descriptor',
  metadata: {
    loops: [{ id: 'l1', name: 'Loop 1', durationMin: 15 }],
  },
  items: [],
};

describe('taskTemplateBuilder v2 field ids', () => {
  it('passes the current template to the save callback', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();

    render(
      <TaskTemplateBuilder
        template={v2LoopTemplate}
        onChange={vi.fn()}
        onSave={onSave}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Save Template' }));

    expect(onSave).toHaveBeenCalledWith(v2LoopTemplate);
  });

  it('confirms before invoking the discard callback', async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();

    render(
      <TaskTemplateBuilder
        template={v2LoopTemplate}
        onChange={vi.fn()}
        onCancel={onCancel}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Discard Draft' }));

    expect(onCancel).toHaveBeenCalledOnce();
  });

  it('uses path-safe field ids when adding a field to a v2 loop', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(<TaskTemplateBuilder template={v2LoopTemplate} onChange={onChange} />);

    await user.click(screen.getByRole('button', { name: 'Add First Field' }));

    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({
      items: [
        expect.objectContaining({
          id: expect.stringMatching(/^fld_[a-z0-9]{10,}$/),
          group: 'l1',
        }),
      ],
    }));
  });

  it('preserves item keys and assigns new fld_ ids when cloning a v2 loop', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const templateWithItems: BuilderTemplateSchemaType = {
      ...v2LoopTemplate,
      items: [
        {
          id: 'fld_original1234',
          key: 'gmv',
          type: 'text',
          label: 'GMV',
          required: true,
          group: 'l1',
          shared_field_key: 'gmv',
        },
      ],
    };

    render(<TaskTemplateBuilder template={templateWithItems} onChange={onChange} />);

    await user.click(screen.getByRole('button', { name: 'Clone loop' }));

    const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1][0];
    const clonedItem = lastCall.items.find((item: { group: string }) => item.group !== 'l1');

    expect(clonedItem).toBeDefined();
    expect(clonedItem.id).toMatch(/^fld_[a-z0-9]{10,}$/);
    expect(clonedItem.id).not.toBe('fld_original1234');
    expect(clonedItem.key).toBe('gmv');
  });

  it('strips the source-loop suffix from key and shared_field_key when cloning a v2 loop', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const legacySuffixedTemplate: BuilderTemplateSchemaType = {
      ...v2LoopTemplate,
      metadata: {
        loops: [{ id: 'l12', name: 'Loop 12', durationMin: 15 }],
      },
      items: [
        {
          id: 'fld_legacysrcab',
          key: 'ads_cost_l12',
          type: 'number',
          label: 'Ads Cost',
          required: true,
          group: 'l12',
          shared_field_key: 'ads_cost_l12',
        },
      ],
    };

    render(<TaskTemplateBuilder template={legacySuffixedTemplate} onChange={onChange} />);

    await user.click(screen.getByRole('button', { name: 'Clone loop' }));

    const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1][0];
    const clonedItem = lastCall.items.find((item: { group: string }) => item.group !== 'l12');

    expect(clonedItem).toBeDefined();
    expect(clonedItem.group).not.toBe('l12');
    // The source-loop suffix is stripped — both the editor handle and the shared
    // field reference become canonical, so descriptor projection attaches the
    // new loop id correctly instead of producing the broken double-suffix.
    expect(clonedItem.key).toBe('ads_cost');
    expect(clonedItem.shared_field_key).toBe('ads_cost');
  });

  it('binds a field to a compatible system fact key from the field editor', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const templateWithField: BuilderTemplateSchemaType = {
      ...v2LoopTemplate,
      items: [
        {
          id: 'fld_showactual1',
          key: 'actual_start',
          type: 'text',
          label: 'Actual start',
          required: true,
          group: 'l1',
        },
      ],
    };

    render(<TaskTemplateBuilder template={templateWithField} onChange={onChange} />);

    await user.click(screen.getByRole('combobox', { name: 'Auto-fill record field' }));
    await user.click(await screen.findByRole('option', { name: /Show actual start time/ }));

    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({
      items: [
        expect.objectContaining({
          id: 'fld_showactual1',
          type: 'datetime',
          system_fact_key: 'show_actual_start_time',
        }),
      ],
    }));
  });

  it('uses checkbox explanation rules for creator attendance missing bindings', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const templateWithField: BuilderTemplateSchemaType = {
      ...v2LoopTemplate,
      items: [
        {
          id: 'fld_creatormiss1',
          key: 'creator_missing',
          type: 'text',
          label: 'Creator missing',
          required: true,
          group: 'l1',
        },
      ],
    };

    render(<TaskTemplateBuilder template={templateWithField} onChange={onChange} />);

    await user.click(screen.getByRole('combobox', { name: 'Auto-fill record field' }));
    await user.click(await screen.findByRole('option', { name: 'Creator attendance missing' }));

    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({
      items: [
        expect.objectContaining({
          id: 'fld_creatormiss1',
          type: 'checkbox',
          system_fact_key: 'creator_attendance_missing',
          validation: expect.objectContaining({
            require_reason: 'on-true',
          }),
        }),
      ],
    }));
  });

  it('disables the auto-fill record field picker on shared fields', () => {
    const onChange = vi.fn();
    const templateWithSharedField: BuilderTemplateSchemaType = {
      ...v2LoopTemplate,
      items: [
        {
          id: 'fld_sharedgmv01',
          key: 'gmv',
          type: 'number',
          label: 'GMV',
          required: true,
          group: 'l1',
          shared_field_key: 'gmv',
        },
      ],
    };

    render(<TaskTemplateBuilder template={templateWithSharedField} onChange={onChange} />);

    const combobox = screen.getByRole('combobox', { name: 'Auto-fill record field' });
    expect(combobox).toBeDisabled();
  });

  describe('client Mechanics LoopxMechanic Matrix', () => {
    const v2MechanicTemplate: BuilderTemplateSchemaType = {
      ...v2LoopTemplate,
      client_id: 'client_abc',
    };

    it('renders the Client Mechanics Matrix when client_id is set', () => {
      render(<TaskTemplateBuilder template={v2MechanicTemplate} onChange={vi.fn()} />);

      expect(screen.getByText('Client Mechanics Matrix')).toBeInTheDocument();
      // active mechanics are rows (loops are columns -- mechanics can run
      // into the dozens, loops stay few, so mechanics scroll, loops don't)
      expect(screen.getByText('Speaking Rule Active')).toBeInTheDocument();
      expect(screen.getByText('Speaking Rule Superseded')).toBeInTheDocument();
      // retired mechanics should NOT be rendered as rows
      expect(screen.queryByText('Speaking Rule Retired')).toBeNull();
    });

    it('filters matrix rows by mechanic title or instruction label', async () => {
      const user = userEvent.setup();
      render(<TaskTemplateBuilder template={v2MechanicTemplate} onChange={vi.fn()} />);

      const search = screen.getByPlaceholderText(/Search \d+ mechanics?/i);
      await user.type(search, 'Superseded');

      expect(screen.getByText('Speaking Rule Superseded')).toBeInTheDocument();
      expect(screen.queryByText('Speaking Rule Active')).toBeNull();
    });

    it('shows an empty state when the search matches no mechanics', async () => {
      const user = userEvent.setup();
      render(<TaskTemplateBuilder template={v2MechanicTemplate} onChange={vi.fn()} />);

      const search = screen.getByPlaceholderText(/Search \d+ mechanics?/i);
      await user.type(search, 'no-such-mechanic');

      expect(screen.getByText(/No mechanics match/i)).toBeInTheDocument();
    });

    it('forces Cards (hides the matrix grid) on mobile viewports', () => {
      mockUseIsMobile.mockReturnValue(true);

      render(<TaskTemplateBuilder template={v2MechanicTemplate} onChange={vi.fn()} />);

      expect(screen.queryByText('Client Mechanics Matrix')).toBeNull();
      expect(screen.getByText(/larger screen/i)).toBeInTheDocument();

      mockUseIsMobile.mockReturnValue(false);
    });

    it('hints that the client has no mechanics yet, instead of silently hiding the matrix', () => {
      mockUseClientMechanicsQuery.mockReturnValueOnce({ data: { data: [] }, isLoading: false });

      render(<TaskTemplateBuilder template={v2MechanicTemplate} onChange={vi.fn()} />);

      expect(screen.queryByText('Client Mechanics Matrix')).toBeNull();
      expect(screen.getByText(/no mechanics in the catalog yet/i)).toBeInTheDocument();
    });

    it('hints that the client\'s mechanics are all retired, instead of silently hiding the matrix', () => {
      mockUseClientMechanicsQuery.mockReturnValueOnce({
        data: { data: mockMechanics.filter((m) => m.status === 'retired') },
        isLoading: false,
      });

      render(<TaskTemplateBuilder template={v2MechanicTemplate} onChange={vi.fn()} />);

      expect(screen.queryByText('Client Mechanics Matrix')).toBeNull();
      expect(screen.getByText(/are all retired/i)).toBeInTheDocument();
    });

    it('does not show the no-mechanics hint while the catalog is still loading', () => {
      mockUseClientMechanicsQuery.mockReturnValueOnce({ data: { data: [] }, isLoading: true });

      render(<TaskTemplateBuilder template={v2MechanicTemplate} onChange={vi.fn()} />);

      expect(screen.queryByText(/no mechanics in the catalog yet/i)).toBeNull();
    });

    it('toggles mechanic checkbox to assign/remove a mechanic-backed field', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();

      render(<TaskTemplateBuilder template={v2MechanicTemplate} onChange={onChange} />);

      const checkbox = screen.getByRole('checkbox', { name: 'Toggle Speaking Rule Active for Loop 1' });
      await user.click(checkbox);

      expect(onChange).toHaveBeenCalledWith(expect.objectContaining({
        items: [
          expect.objectContaining({
            key: 'cmech_active',
            type: 'checkbox',
            label: 'Product Promo Active',
            description: 'Talk about product active for 5 minutes.',
            group: 'l1',
            mechanic_ref: expect.objectContaining({
              client_id: 'client_abc',
              mechanic_id: 'cmech_active',
              content_revision: 2,
            }),
          }),
        ],
      }));
    });

    it('locks input fields (label, type, description) for mechanic-backed fields', () => {
      const templateWithMechanic: BuilderTemplateSchemaType = {
        ...v2MechanicTemplate,
        items: [
          {
            id: 'fld_mech1',
            key: 'cmech_active',
            type: 'checkbox',
            label: 'Product Promo Active',
            description: 'Talk about product active for 5 minutes.',
            required: true,
            group: 'l1',
            mechanic_ref: {
              client_id: 'client_abc',
              mechanic_id: 'cmech_active',
              content_revision: 2,
            },
          },
        ],
      };

      render(<TaskTemplateBuilder template={templateWithMechanic} onChange={vi.fn()} />);

      // The label input, type select, and description textarea should be disabled/locked
      const labelInput = screen.getByLabelText('Label');
      expect(labelInput).toBeDisabled();

      const typeSelect = screen.getByRole('combobox', { name: 'Type' });
      expect(typeSelect).toBeDisabled();

      const descriptionTextarea = screen.getByLabelText('Description / Help Text');
      expect(descriptionTextarea).toBeDisabled();
    });

    it('renders a warning badge and upgrade action for superseded mechanic references', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      const templateWithSuperseded: BuilderTemplateSchemaType = {
        ...v2MechanicTemplate,
        items: [
          {
            id: 'fld_mech_super',
            key: 'cmech_superseded',
            type: 'checkbox',
            label: 'Product Promo Superseded (Old)',
            description: 'Old instructions...',
            required: true,
            group: 'l1',
            mechanic_ref: {
              client_id: 'client_abc',
              mechanic_id: 'cmech_superseded',
              content_revision: 1, // older than catalog content_revision: 3
            },
          },
        ],
      };

      render(<TaskTemplateBuilder template={templateWithSuperseded} onChange={onChange} />);

      // Warning badge / text should exist
      expect(screen.getAllByText('Catalog Update Available').length).toBeGreaterThan(0);

      // Upgrade button should exist and trigger onChange with updated catalog details
      const upgradeButton = screen.getAllByRole('button', { name: /Upgrade/i })[0];
      await user.click(upgradeButton);

      expect(onChange).toHaveBeenCalledWith(expect.objectContaining({
        items: [
          expect.objectContaining({
            id: 'fld_mech_super',
            label: 'Product Promo Superseded (New)',
            description: 'Talk about product superseded (new instructions).',
            mechanic_ref: expect.objectContaining({
              content_revision: 3,
            }),
          }),
        ],
      }));
    });

    it('generates a loop-scoped key for v1 templates when the same mechanic is checked into a second loop', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      const v1TwoLoopTemplate: BuilderTemplateSchemaType = {
        name: 'V1 moderation template',
        description: '',
        task_type: 'ACTIVE',
        client_id: 'client_abc',
        metadata: {
          loops: [
            { id: 'l1', name: 'Loop 1', durationMin: 15 },
            { id: 'l2', name: 'Loop 2', durationMin: 15 },
          ],
        },
        items: [
          {
            id: 'item_1',
            key: 'cmech_active',
            type: 'checkbox',
            label: 'Product Promo Active',
            description: 'Talk about product active for 5 minutes.',
            required: true,
            group: 'l1',
            mechanic_ref: {
              client_id: 'client_abc',
              mechanic_id: 'cmech_active',
              content_revision: 2,
            },
          },
        ],
      };

      render(<TaskTemplateBuilder template={v1TwoLoopTemplate} onChange={onChange} />);

      const checkbox = screen.getByRole('checkbox', { name: 'Toggle Speaking Rule Active for Loop 2' });
      await user.click(checkbox);

      const updatedTemplate = onChange.mock.calls[0][0];
      const keys = updatedTemplate.items.map((item: { key: string }) => item.key);
      // Both fields reference the same mechanic but must have distinct keys --
      // v1 requires globally-unique item keys within a template.
      expect(keys).toEqual(['cmech_active', 'cmech_active_l2']);
      expect(new Set(keys).size).toBe(keys.length);
    });
  });
});
