/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { shouldBlockUnmappedHost } from './unmapped-host.guard';

describe('shouldBlockUnmappedHost', () => {
  it('never blocks unless the flag is switched on', () => {
    expect(shouldBlockUnmappedHost('unknown.example.org', undefined)).toBe(false);
    expect(shouldBlockUnmappedHost('unknown.example.org', 'false')).toBe(false);
  });

  it('never blocks loopback hosts', () => {
    expect(shouldBlockUnmappedHost('localhost', true)).toBe(false);
    expect(shouldBlockUnmappedHost('127.0.0.1', 'true')).toBe(false);
  });

  it('allows a host whose subdomain maps to a cooperative', () => {
    expect(shouldBlockUnmappedHost('2079saji0009.example.org', true)).toBe(false);
  });

  it('blocks an unmapped host when switched on', () => {
    expect(shouldBlockUnmappedHost('unknown.example.org', true)).toBe(true);
    expect(shouldBlockUnmappedHost('103.175.192.233', 'true')).toBe(true);
  });
});
