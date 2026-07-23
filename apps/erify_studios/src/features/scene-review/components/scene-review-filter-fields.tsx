import { useQuery } from '@tanstack/react-query';

import {
  AsyncCombobox,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@eridu/ui';

import { getPlatforms } from '@/features/platforms/api/get-platforms';
import { useSceneReviewClientFilter } from '@/features/scene-review/hooks/use-scene-review-client-filter';
import * as m from '@/paraglide/messages';

type SceneReviewFilterFieldsProps = {
  studioId: string;
  clientId?: string;
  platformId?: string;
  onClientChange: (value?: string) => void;
  onPlatformChange: (value?: string) => void;
};

export function SceneReviewFilterFields({
  studioId,
  clientId,
  platformId,
  onClientChange,
  onPlatformChange,
}: SceneReviewFilterFieldsProps) {
  const clientFilter = useSceneReviewClientFilter(studioId, clientId);
  const platforms = useQuery({
    queryKey: ['scene-review-platform-options', studioId],
    queryFn: ({ signal }) => getPlatforms({ limit: 50 }, studioId, { signal }),
    staleTime: 60 * 60 * 1000,
  });

  return (
    <div className="space-y-4 p-4">
      <div className="space-y-1.5">
        <Label>{m.scene_review_client()}</Label>
        <AsyncCombobox
          value={clientId ?? ''}
          onChange={(value) => onClientChange(value || undefined)}
          onSearch={clientFilter.setSearch}
          options={clientFilter.options}
          isLoading={clientFilter.isLoading}
          placeholder={m.scene_review_client_placeholder()}
          emptyMessage={m.scene_review_client_empty()}
        />
      </div>
      <div className="space-y-1.5">
        <Label>{m.scene_review_platform()}</Label>
        <Select
          value={platformId ?? 'all'}
          onValueChange={(value) => onPlatformChange(value === 'all' ? undefined : value)}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder={m.scene_review_platform_placeholder()} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{m.scene_review_platform_all()}</SelectItem>
            {(platforms.data?.data ?? []).map((platform) => (
              <SelectItem key={platform.id} value={platform.id}>
                {platform.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
