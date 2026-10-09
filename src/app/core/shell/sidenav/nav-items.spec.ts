/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { modulePermission, navSections } from './nav-items';

describe('navSections', () => {
  const modules = navSections.flatMap((section) => section.items);

  it('links every module and page to an absolute path', () => {
    const paths = modules.flatMap((item) => (item.children ?? [item]).map((entry) => entry.path[0]));
    expect(paths.every((path) => typeof path === 'string' && path.startsWith('/'))).toBe(true);
  });

  it('gives each module either a link or pages, never both', () => {
    expect(modules.every((item) => !!item.path !== !!item.children?.length)).toBe(true);
  });

  it('shows a group to anyone with a permission of one of its pages', () => {
    const permissions = modulePermission({
      label: 'Group',
      icon: 'groups',
      children: [
        { label: 'A', path: ['/a'], permission: 'READ_A' },
        { label: 'B', path: ['/b'], permission: [
            'READ_B',
            'READ_C'
          ] }
      ]
    });
    expect(permissions).toEqual([
      'READ_A',
      'READ_B',
      'READ_C'
    ]);
  });

  it('keeps an explicit permission and leaves public links open', () => {
    expect(modulePermission({ label: 'X', icon: 'x', path: ['/x'], permission: 'READ_X' })).toBe('READ_X');
    expect(modulePermission({ label: 'Y', icon: 'y', path: ['/y'] })).toBeUndefined();
  });
});
