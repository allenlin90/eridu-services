import { render, screen } from '@testing-library/react';
import { Children, isValidElement, type ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { CREATOR_COMPENSATION_TYPE } from '@eridu/api-types/creators';

import { UNSET_COMPENSATION_TYPE } from '../../lib/studio-creator-compensation';
import { CreatorCompensationFields } from '../creator-compensation-fields';

vi.mock('@eridu/ui', () => ({
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} />,
  Label: ({ children, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) => <label {...props}>{children}</label>,
  Select: ({
    children,
    value,
    onValueChange,
    disabled,
  }: {
    children: ReactNode;
    value?: string;
    onValueChange?: (value: string) => void;
    disabled?: boolean;
  }) => {
    let triggerId: string | undefined;
    // eslint-disable-next-line react/no-children-for-each -- test-only mock; reading id off SelectTrigger child
    Children.forEach(children, (child) => {
      if (isValidElement(child) && (child.props as { id?: string }).id) {
        triggerId = (child.props as { id?: string }).id;
      }
    });
    return (
      <select
        id={triggerId}
        value={value}
        onChange={(event) => onValueChange?.(event.target.value)}
        disabled={disabled}
      >
        {children}
      </select>
    );
  },
  SelectContent: ({ children }: { children: ReactNode }) => <>{children}</>,
  SelectItem: ({
    children,
    value,
    disabled,
  }: {
    children: ReactNode;
    value: string;
    disabled?: boolean;
  }) => (
    <option value={value} disabled={disabled}>
      {children}
    </option>
  ),
  SelectTrigger: ({ children }: { children: ReactNode }) => <>{children}</>,
  SelectValue: () => null,
}));

describe('creatorCompensationFields', () => {
  it('disables hybrid and commission default compensation options', () => {
    render(
      <CreatorCompensationFields
        defaultRate=""
        defaultRateType={UNSET_COMPENSATION_TYPE}
        defaultCommissionRate=""
        onDefaultRateChange={vi.fn()}
        onDefaultRateTypeChange={vi.fn()}
        onDefaultCommissionRateChange={vi.fn()}
      />,
    );

    const compensationTypeSelect = screen.getByLabelText('Compensation Type');
    expect(compensationTypeSelect).toHaveValue(UNSET_COMPENSATION_TYPE);
    expect(screen.getByRole('option', { name: 'Fixed' })).not.toBeDisabled();
    expect(screen.getByRole('option', { name: 'Commission' })).toBeDisabled();
    expect(screen.getByRole('option', { name: 'Hybrid' })).toBeDisabled();

    expect(screen.getByRole('option', { name: 'Commission' })).toHaveValue(
      CREATOR_COMPENSATION_TYPE.COMMISSION,
    );
    expect(screen.getByRole('option', { name: 'Hybrid' })).toHaveValue(
      CREATOR_COMPENSATION_TYPE.HYBRID,
    );
  });
});
