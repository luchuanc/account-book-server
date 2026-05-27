import { hasAtLeastRole } from './roles';

describe('roles', () => {
  it('allows higher roles to access lower roles', () => {
    expect(hasAtLeastRole('owner', 'viewer')).toBe(true);
    expect(hasAtLeastRole('admin', 'editor')).toBe(true);
  });

  it('blocks lower roles from elevated operations', () => {
    expect(hasAtLeastRole('viewer', 'editor')).toBe(false);
    expect(hasAtLeastRole('editor', 'admin')).toBe(false);
  });
});
