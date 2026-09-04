/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { QueryClient } from '@tanstack/angular-query-experimental';

import { coopQueryKeys } from './coop-query-keys';

/**
 * Removes every cached query tied to the current user's session
 * (profile, /me, and the entire admin list/detail/stats subtree) on
 * logout, so a different account logging in afterwards on the same
 * browser session never sees stale data from the previous session.
 *
 * Locations are intentionally left cached - they are static,
 * non-user-specific reference data shared by every Coop user.
 */
export function clearCoopUserQueries(queryClient: QueryClient): void {
  queryClient.removeQueries({ queryKey: coopQueryKeys.profile() });

  queryClient.removeQueries({ queryKey: coopQueryKeys.me() });

  queryClient.removeQueries({ queryKey: coopQueryKeys.admin.root() });
}
