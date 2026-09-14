/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { resolveCoop } from '../../environments/coop-config';

const LOOPBACK_HOSTS = new Set([
  'localhost',
  '127.0.0.1',
  '[::1]'
]);

/**
 * Whether the Mifos sign-in should be blocked on this hostname.
 *
 * An unmapped host silently falls back to the "default" tenant, which gives a
 * cooperative a baffling "invalid credentials" error on the wrong tenant. This
 * is opt-in (window.env.blockUnmappedHosts) because some deployments are
 * legitimately served from a bare IP address that maps to no cooperative.
 * Loopback hosts are never blocked, so local development is unaffected.
 */
export function shouldBlockUnmappedHost(hostname: string, blockUnmappedHosts: unknown): boolean {
  const enabled = blockUnmappedHosts === true || blockUnmappedHosts === 'true';

  if (!enabled || LOOPBACK_HOSTS.has(hostname.toLowerCase())) {
    return false;
  }

  return !resolveCoop(hostname).matched;
}

export const unmappedHostGuard: CanActivateFn = () => {
  const env = (window as unknown as { env?: { blockUnmappedHosts?: unknown } }).env;

  return shouldBlockUnmappedHost(window.location.hostname, env?.blockUnmappedHosts)
    ? inject(Router).createUrlTree(['/unconfigured-host'])
    : true;
};
