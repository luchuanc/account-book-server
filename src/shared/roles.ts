export const BOOK_ROLES = ['owner', 'admin', 'editor', 'viewer'] as const;
export type BookRole = (typeof BOOK_ROLES)[number];

export const BOOK_ROLE_WEIGHT: Record<BookRole, number> = {
  owner: 4,
  admin: 3,
  editor: 2,
  viewer: 1,
};

export function hasAtLeastRole(current: BookRole, target: BookRole) {
  return BOOK_ROLE_WEIGHT[current] >= BOOK_ROLE_WEIGHT[target];
}
