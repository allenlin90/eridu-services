import { useRef, useState } from 'react';

import {
  Button,
  Checkbox,
  DatePicker,
  Input,
  ResponsiveDateTimePicker,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Spinner,
  Textarea,
} from '@eridu/ui';

import type { FieldRendererProps, PendingUpload } from './json-form.types';
import { formatFileSize, getFieldMaxHint, shouldAttemptImagePreview } from './json-form.utils';

import type { UiSchema } from '@/lib/zod-schema-builder';

/**
 * File-field UI: pending-upload preview + status, current-uploaded link/preview
 * with broken-image fallback, and the choose/replace/remove controls. Selection
 * is delegated upward via `onFileSelect`; this component renders state only.
 */
function FileFieldRenderer({
  item,
  currentUrl,
  readOnly,
  pendingUpload,
  isUploading,
  onClearPendingUpload,
  onClearCurrentUpload,
  onFileSelect,
}: {
  item: UiSchema['items'][0];
  currentUrl: string;
  readOnly?: boolean;
  pendingUpload?: PendingUpload;
  isUploading?: boolean;
  onClearPendingUpload?: () => void;
  onClearCurrentUpload?: () => void;
  onFileSelect?: (file: File) => void;
}) {
  const shouldPreviewCurrentImage = shouldAttemptImagePreview(item, currentUrl);
  const [brokenPreviewUrl, setBrokenPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isBusy = isUploading || pendingUpload?.isPreparing;
  const isCurrentPreviewBroken = !!currentUrl && brokenPreviewUrl === currentUrl;

  if (readOnly) {
    return currentUrl
      ? (
          <div className="space-y-2">
            {shouldPreviewCurrentImage && !isCurrentPreviewBroken && (
              <img
                src={currentUrl}
                alt={item.label}
                className="max-h-48 w-auto rounded-md border object-contain"
                onLoad={() => setBrokenPreviewUrl(null)}
                onError={() => setBrokenPreviewUrl(currentUrl)}
              />
            )}
            {shouldPreviewCurrentImage && isCurrentPreviewBroken && (
              <p className="text-xs text-amber-700">
                Image preview unavailable for this link.
              </p>
            )}
            <a
              href={currentUrl}
              target="_blank"
              rel="noreferrer"
              className="text-sm text-primary hover:underline break-all"
            >
              {currentUrl}
            </a>
          </div>
        )
      : (
          <p className="text-sm text-muted-foreground italic">No file uploaded</p>
        );
  }

  return (
    <div className="space-y-2">
      {pendingUpload && (
        <div className="space-y-2 rounded-md border p-2">
          {pendingUpload.previewUrl && (
            <img
              src={pendingUpload.previewUrl}
              alt={pendingUpload.file.name}
              className="max-h-48 w-auto rounded-md border object-contain"
            />
          )}
          <p className="text-xs text-muted-foreground">
            Pending upload:
            {' '}
            {pendingUpload.file.name}
          </p>
          <p className="text-xs text-muted-foreground">
            Size:
            {' '}
            {formatFileSize(pendingUpload.file.size)}
          </p>
          <p className="text-xs text-muted-foreground">
            Max size:
            {' '}
            {getFieldMaxHint(item, pendingUpload)}
          </p>
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            {pendingUpload.isPreparing && <Spinner className="size-3" />}
            {pendingUpload.isPreparing
              ? (pendingUpload.file.type.startsWith('image/')
                  ? 'Compressing image...'
                  : 'Preparing file...')
              : 'Will upload when you submit.'}
          </p>
          {pendingUpload.error && (
            <p className="text-xs text-red-600">{pendingUpload.error}</p>
          )}
        </div>
      )}

      {currentUrl && (
        <div className="space-y-2 rounded-md border p-2">
          {shouldPreviewCurrentImage && !isCurrentPreviewBroken && (
            <img
              src={currentUrl}
              alt={item.label}
              className="max-h-48 w-auto rounded-md border object-contain"
              onLoad={() => setBrokenPreviewUrl(null)}
              onError={() => setBrokenPreviewUrl(currentUrl)}
            />
          )}
          {shouldPreviewCurrentImage && isCurrentPreviewBroken && (
            <p className="text-xs text-amber-700">
              Image preview unavailable. File may be missing or link is broken. You can replace and submit again.
            </p>
          )}
          <a
            href={currentUrl}
            target="_blank"
            rel="noreferrer"
            className="block text-sm text-primary hover:underline break-all"
          >
            {currentUrl}
          </a>
        </div>
      )}

      <Input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept={item.validation?.accept}
        disabled={isBusy}
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file && onFileSelect) {
            void onFileSelect(file);
          }
          event.target.value = '';
        }}
      />

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          disabled={isBusy}
          onClick={() => fileInputRef.current?.click()}
        >
          {(pendingUpload || currentUrl) ? 'Replace File' : 'Choose File'}
        </Button>

        {pendingUpload && (
          <Button
            type="button"
            variant="outline"
            disabled={isBusy}
            onClick={onClearPendingUpload}
          >
            Remove Pending
          </Button>
        )}

        {!pendingUpload && currentUrl && (
          <Button
            type="button"
            variant="outline"
            disabled={isBusy}
            onClick={onClearCurrentUpload}
          >
            Remove Uploaded
          </Button>
        )}
      </div>
      {isUploading && (
        <p className="text-xs text-muted-foreground">Uploading...</p>
      )}
      {!pendingUpload && (
        <p className="text-xs text-muted-foreground">
          Max size:
          {' '}
          {getFieldMaxHint(item)}
        </p>
      )}
    </div>
  );
}

/**
 * Dispatches a single schema field to its input control by `item.type`
 * (text/textarea/number/select/multiselect/date/datetime/file), delegating file
 * fields to {@link FileFieldRenderer}. Unknown types render an inline notice.
 */
export function FieldRenderer({
  item,
  field,
  readOnly,
  isUploading = false,
  pendingUpload,
  onClearPendingUpload,
  onClearCurrentUpload,
  onFileSelect,
}: FieldRendererProps) {
  switch (item.type) {
    case 'text':
      return (
        <Input
          {...field}
          placeholder={item.label}
          disabled={readOnly}
          value={(field.value as string) ?? ''}
        />
      );
    case 'textarea':
      return (
        <Textarea
          {...field}
          placeholder={item.label}
          disabled={readOnly}
          value={(field.value as string) ?? ''}
        />
      );
    case 'number':
      return (
        <Input
          {...field}
          type="number"
          placeholder={item.label}
          disabled={readOnly}
          onChange={(e) => {
            const parsed = e.target.value === '' ? null : Number(e.target.value);
            field.onChange(Number.isNaN(parsed) ? null : parsed);
          }}
          value={(field.value as number) ?? ''}
        />
      );
    case 'select':
      return (
        <Select
          onValueChange={field.onChange}
          defaultValue={field.value as string}
          disabled={readOnly}
          value={field.value as string}
        >
          <SelectTrigger>
            <SelectValue placeholder={`Select ${item.label.toLowerCase()}`} />
          </SelectTrigger>
          <SelectContent>
            {item.options?.map((option) => (
              <SelectItem
                key={option.value}
                value={option.value}
              >
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    case 'multiselect': {
      const selected: string[] = Array.isArray(field.value) ? (field.value as string[]) : [];
      return (
        <div className="space-y-2">
          {item.options?.map((option) => (
            <label
              key={option.value}
              className="flex items-center gap-2 cursor-pointer"
            >
              <Checkbox
                checked={selected.includes(option.value)}
                disabled={readOnly}
                onCheckedChange={(checked) => {
                  const next = checked
                    ? [...selected, option.value]
                    : selected.filter((v) => v !== option.value);
                  field.onChange(next);
                }}
              />
              <span className="text-sm">{option.label}</span>
            </label>
          ))}
        </div>
      );
    }
    case 'date':
      return (
        <DatePicker
          value={field.value as string}
          onChange={field.onChange}
          className="w-full"
        />
      );
    case 'datetime':
      return (
        <ResponsiveDateTimePicker
          value={field.value as string}
          onChange={field.onChange}
          className="w-full"
        />
      );
    case 'file': {
      const currentUrl = typeof field.value === 'string' ? field.value : '';
      return (
        <FileFieldRenderer
          item={item}
          currentUrl={currentUrl}
          readOnly={readOnly}
          pendingUpload={pendingUpload}
          isUploading={isUploading}
          onClearPendingUpload={onClearPendingUpload}
          onClearCurrentUpload={onClearCurrentUpload}
          onFileSelect={onFileSelect}
        />
      );
    }
    default:
      return (
        <div className="text-muted-foreground italic">
          Unsupported field type:
          {' '}
          {item.type}
        </div>
      );
  }
}
