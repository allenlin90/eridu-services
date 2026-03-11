export type CreatorIdentity = {
  id?: string | null;
  creator_id?: string | null;
  creator_name?: string | null;
  name?: string | null;
  alias_name?: string | null;
  note?: string | null;
  metadata?: Record<string, unknown> | null;
};

export type CreatorCollection = {
  creators?: CreatorIdentity[] | null;
};

export type CreatorNameCollection = {
  creator_names?: string[] | null;
};

export function getCreatorId(creator: CreatorIdentity): string | null {
  return creator.creator_id ?? creator.id ?? null;
}

export function getCreatorName(creator: CreatorIdentity): string | null {
  return creator.creator_name ?? creator.name ?? creator.alias_name ?? null;
}

export function getCreatorCollection(source: CreatorCollection | null | undefined): CreatorIdentity[] {
  if (!source)
    return [];
  return source.creators ?? [];
}

export function getCreatorNames(source: CreatorCollection | null | undefined): string[] {
  return getCreatorCollection(source)
    .map((creator) => getCreatorName(creator))
    .filter((name): name is string => !!name);
}

export function getCreatorNameSummary(source: CreatorNameCollection | null | undefined): string[] {
  if (!source)
    return [];
  return (source.creator_names ?? []).filter((name): name is string => !!name);
}
