import {
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@eridu/ui';

import {
  STUDIO_CREATOR_COMPENSATION_TYPE_OPTIONS,
  type StudioCreatorCompensationTypeOption,
  UNSET_COMPENSATION_TYPE,
} from '../lib/studio-creator-compensation';

export type CreatorCompensationFieldsProps = {
  defaultRate: string;
  defaultRateType: StudioCreatorCompensationTypeOption;
  defaultCommissionRate: string;
  onDefaultRateChange: (value: string) => void;
  onDefaultRateTypeChange: (value: StudioCreatorCompensationTypeOption) => void;
  onDefaultCommissionRateChange: (value: string) => void;
  disabled?: boolean;
};

export function CreatorCompensationFields({
  defaultRate,
  defaultRateType,
  defaultCommissionRate,
  onDefaultRateChange,
  onDefaultRateTypeChange,
  onDefaultCommissionRateChange,
  disabled = false,
}: CreatorCompensationFieldsProps) {
  const commissionDisabled = disabled
    || defaultRateType === UNSET_COMPENSATION_TYPE
    || defaultRateType === 'FIXED';

  return (
    <>
      <div className="space-y-1.5">
        <Label htmlFor="compensation-default-rate">Default Rate</Label>
        <Input
          id="compensation-default-rate"
          type="number"
          min="0"
          step="0.01"
          placeholder="0.00"
          value={defaultRate}
          onChange={(event) => onDefaultRateChange(event.target.value)}
          disabled={disabled}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="compensation-default-rate-type">Compensation Type</Label>
        <Select
          value={defaultRateType}
          onValueChange={(value) => onDefaultRateTypeChange(value as StudioCreatorCompensationTypeOption)}
          disabled={disabled}
        >
          <SelectTrigger id="compensation-default-rate-type">
            <SelectValue placeholder="Select compensation type" />
          </SelectTrigger>
          <SelectContent>
            {STUDIO_CREATOR_COMPENSATION_TYPE_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="compensation-default-commission-rate">Default Commission Rate (%)</Label>
        <Input
          id="compensation-default-commission-rate"
          type="number"
          min="0"
          step="0.01"
          placeholder="0.00"
          value={defaultCommissionRate}
          onChange={(event) => onDefaultCommissionRateChange(event.target.value)}
          disabled={commissionDisabled}
        />
      </div>
    </>
  );
}
