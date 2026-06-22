import {
  CREATOR_TYPE,
  type CreatorType,
} from '@eridu/api-types/creators';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@eridu/ui';

export function CreatorTypeSelect({
  value,
  onChange,
  disabled = false,
}: {
  value: CreatorType | undefined;
  onChange: (value: CreatorType) => void;
  disabled?: boolean;
}) {
  return (
    <Select value={value ?? CREATOR_TYPE.STANDARD} onValueChange={(nextValue) => onChange(nextValue as CreatorType)} disabled={disabled}>
      <SelectTrigger>
        <SelectValue placeholder="Select type" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={CREATOR_TYPE.STANDARD}>Standard</SelectItem>
        <SelectItem value={CREATOR_TYPE.FLEXIBLE}>Flexible</SelectItem>
        <SelectItem value={CREATOR_TYPE.OTHER}>Other</SelectItem>
      </SelectContent>
    </Select>
  );
}
