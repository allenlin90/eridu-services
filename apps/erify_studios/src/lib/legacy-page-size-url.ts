export function hasLegacyPageSizeParam(searchString: string): boolean {
  const params = new URLSearchParams(searchString);
  return params.has('pageSize');
}
