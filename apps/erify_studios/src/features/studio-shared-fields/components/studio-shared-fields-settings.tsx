import { ChevronDown, Save } from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

import { STUDIO_ROLE } from '@eridu/api-types/memberships';
import {
  FieldTypeEnum,
  type SharedField,
  type SharedFieldCategory,
  sharedFieldCategorySchema,
} from '@eridu/api-types/task-management';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Checkbox,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from '@eridu/ui';
import { cn } from '@eridu/ui/lib/utils';

import { useSharedFieldMutations } from '../hooks/use-shared-field-mutations';
import { useStudioSharedFields } from '../hooks/use-studio-shared-fields';

import { useStudioAccess } from '@/lib/hooks/use-studio-access';

type StudioSharedFieldsSettingsProps = {
  studioId: string;
};

type SharedFieldDraft = {
  label: string;
  description: string;
  is_active: boolean;
};

const SHARED_FIELD_CATEGORIES = sharedFieldCategorySchema.options;
const FIELD_TYPES = FieldTypeEnum.options;

const CATEGORY_TITLES: Record<SharedFieldCategory, string> = {
  metric: 'Metrics',
  evidence: 'Evidence',
  status: 'Status',
};

function toFieldDraft(field: SharedField): SharedFieldDraft {
  return {
    label: field.label,
    description: field.description ?? '',
    is_active: field.is_active,
  };
}

export function StudioSharedFieldsSettings({ studioId }: StudioSharedFieldsSettingsProps) {
  const { role } = useStudioAccess(studioId);
  const isStudioAdmin = role === STUDIO_ROLE.ADMIN;

  const { data, isLoading, isError } = useStudioSharedFields({ studioId });
  const { createMutation, updateMutation } = useSharedFieldMutations({ studioId });

  const [createForm, setCreateForm] = useState<{
    key: string;
    type: string;
    category: SharedFieldCategory;
    label: string;
    description: string;
  }>({
    key: '',
    type: 'number',
    category: 'metric',
    label: '',
    description: '',
  });
  const [draftEditsByKey, setDraftEditsByKey] = useState<Record<string, Partial<SharedFieldDraft>>>({});
  const [expandedByKey, setExpandedByKey] = useState<Record<string, boolean>>({});

  const groupedFields = useMemo(() => {
    const fields = data?.shared_fields ?? [];
    return SHARED_FIELD_CATEGORIES.reduce<Record<SharedFieldCategory, SharedField[]>>((acc, category) => {
      acc[category] = fields
        .filter((field) => field.category === category)
        .sort((a, b) => a.key.localeCompare(b.key));
      return acc;
    }, {
      metric: [],
      evidence: [],
      status: [],
    });
  }, [data?.shared_fields]);

  const handleCreateField = async () => {
    try {
      const payload = {
        key: createForm.key.trim(),
        type: createForm.type as SharedField['type'],
        category: createForm.category,
        label: createForm.label.trim(),
        description: createForm.description.trim() || undefined,
        is_active: true,
      };
      await createMutation.mutateAsync(payload);
      setCreateForm({
        key: '',
        type: createForm.type,
        category: createForm.category,
        label: '',
        description: '',
      });
      toast.success('Shared field created');
    } catch (error) {
      console.error(error);
      toast.error('Failed to create shared field');
    }
  };

  const getDraft = (field: SharedField): SharedFieldDraft => {
    const edited = draftEditsByKey[field.key];
    if (!edited) {
      return toFieldDraft(field);
    }
    return {
      ...toFieldDraft(field),
      ...edited,
    };
  };

  const handleSaveField = async (field: SharedField) => {
    const draft = getDraft(field);
    const payload = {
      label: draft.label.trim(),
      description: draft.description.trim() || undefined,
      is_active: draft.is_active,
    };

    try {
      await updateMutation.mutateAsync({ fieldKey: field.key, payload });
      setDraftEditsByKey((prev) => {
        if (!prev[field.key]) {
          return prev;
        }
        const next = { ...prev };
        delete next[field.key];
        return next;
      });
      toast.success(`Updated "${field.key}"`);
    } catch (error) {
      console.error(error);
      toast.error(`Failed to update "${field.key}"`);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Shared Fields Catalog</CardTitle>
          <CardDescription>
            Reusable fields that keep reports consistent across templates. After a field is created, its ID, type, and category cannot be changed.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!isStudioAdmin && (
            <div className="rounded-md border bg-muted px-3 py-2 text-sm text-muted-foreground">
              You have read-only access. Only studio admins can create or update shared fields.
            </div>
          )}
          {isLoading && <p className="text-sm text-muted-foreground">Loading shared fields...</p>}
          {isError && <p className="text-sm text-destructive">Failed to load shared fields.</p>}
          {!isLoading && !isError && SHARED_FIELD_CATEGORIES.map((category) => (
            <div key={category} className="space-y-3">
              <div className="flex items-center gap-2">
                <h3 className="font-medium">{CATEGORY_TITLES[category]}</h3>
                <Badge variant="outline">{groupedFields[category].length}</Badge>
              </div>
              {groupedFields[category].length === 0 && (
                <div className="rounded-md border border-dashed px-3 py-2 text-sm text-muted-foreground">
                  No shared fields in this category.
                </div>
              )}
              {groupedFields[category].map((field) => {
                const draft = getDraft(field);
                const isExpanded = expandedByKey[field.key] ?? false;
                return (
                  <Collapsible
                    key={field.key}
                    open={isExpanded}
                    onOpenChange={(open) => {
                      setExpandedByKey((prev) => ({ ...prev, [field.key]: open }));
                    }}
                    className="rounded-md border"
                  >
                    <CollapsibleTrigger asChild>
                      <button
                        type="button"
                        className="flex w-full items-start justify-between gap-3 px-3 py-3 text-left"
                      >
                        <div className="min-w-0 space-y-1">
                          <div className="font-medium">{draft.label || field.label || field.key}</div>
                          <div className="text-xs text-muted-foreground break-all">
                            {field.key}
                            {' • '}
                            {field.type}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Badge variant="outline">{draft.is_active ? 'Active' : 'Inactive'}</Badge>
                          <ChevronDown className={cn('h-4 w-4 transition-transform', isExpanded && 'rotate-180')} />
                        </div>
                      </button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="border-t px-3 pb-3 pt-3">
                      <div className="grid gap-3 md:grid-cols-2">
                        <div className="space-y-1.5">
                          <Label>Key</Label>
                          <Input value={field.key} disabled />
                        </div>
                        <div className="space-y-1.5">
                          <Label>Type</Label>
                          <Input value={field.type} disabled />
                        </div>
                        <div className="space-y-1.5">
                          <Label>Label</Label>
                          <Input
                            value={draft.label}
                            onChange={(event) => {
                              const value = event.target.value;
                              setDraftEditsByKey((prev) => ({
                                ...prev,
                                [field.key]: { ...prev[field.key], label: value },
                              }));
                            }}
                            readOnly={!isStudioAdmin}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label>Category</Label>
                          <Input value={field.category} disabled />
                        </div>
                        <div className="space-y-1.5 md:col-span-2">
                          <Label>Description</Label>
                          <Textarea
                            value={draft.description}
                            onChange={(event) => {
                              const value = event.target.value;
                              setDraftEditsByKey((prev) => ({
                                ...prev,
                                [field.key]: { ...prev[field.key], description: value },
                              }));
                            }}
                            readOnly={!isStudioAdmin}
                            rows={2}
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <Checkbox
                            id={`is-active-${field.key}`}
                            checked={draft.is_active}
                            onCheckedChange={(checked) => {
                              const next = Boolean(checked);
                              setDraftEditsByKey((prev) => ({
                                ...prev,
                                [field.key]: { ...prev[field.key], is_active: next },
                              }));
                            }}
                            disabled={!isStudioAdmin}
                          />
                          <Label htmlFor={`is-active-${field.key}`} className="font-normal">Active</Label>
                        </div>
                      </div>
                      {isStudioAdmin && (
                        <div className="mt-3 flex justify-end">
                          <Button
                            size="sm"
                            onClick={() => void handleSaveField(field)}
                            disabled={updateMutation.isPending}
                          >
                            <Save className="mr-2 h-4 w-4" />
                            Save Changes
                          </Button>
                        </div>
                      )}
                    </CollapsibleContent>
                  </Collapsible>
                );
              })}
            </div>
          ))}
        </CardContent>
      </Card>

      {isStudioAdmin && (
        <Card>
          <CardHeader>
            <CardTitle>Create Shared Field</CardTitle>
            <CardDescription>
              Create a new canonical shared field. Key, type, and category cannot be changed after creation.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Key (snake_case)</Label>
              <Input
                value={createForm.key}
                onChange={(event) => setCreateForm((prev) => ({ ...prev, key: event.target.value }))}
                placeholder="gmv"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Label</Label>
              <Input
                value={createForm.label}
                onChange={(event) => setCreateForm((prev) => ({ ...prev, label: event.target.value }))}
                placeholder="GMV"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select
                value={createForm.type}
                onValueChange={(value) => setCreateForm((prev) => ({ ...prev, type: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select field type" />
                </SelectTrigger>
                <SelectContent>
                  {FIELD_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select
                value={createForm.category}
                onValueChange={(value) => setCreateForm((prev) => ({ ...prev, category: value as SharedFieldCategory }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {SHARED_FIELD_CATEGORIES.map((category) => (
                    <SelectItem key={category} value={category}>
                      {CATEGORY_TITLES[category]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label>Description (optional)</Label>
              <Textarea
                value={createForm.description}
                onChange={(event) => setCreateForm((prev) => ({ ...prev, description: event.target.value }))}
                rows={2}
              />
            </div>
            <div className="md:col-span-2 flex justify-end">
              <Button
                onClick={() => void handleCreateField()}
                disabled={createMutation.isPending}
              >
                Create Field
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
