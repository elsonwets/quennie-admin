// Shared `?id=` search param: the selected record on list pages, so selections are linkable.
export const validateIdSearch = (search: Record<string, unknown>): { id?: string } =>
  typeof search.id === 'string' ? { id: search.id } : {}
