/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { firstValueFrom } from 'rxjs';
import { queryOptions } from '@tanstack/angular-query-experimental';

import { CoopProfileService } from '../services/coop-profile.service';
import { coopQueryKeys } from './coop-query-keys';

/*
 * Reusable, type-safe query option factories - the single place that
 * ties a Coop query key to its fetcher and cache policy. Components
 * call these from injectQuery(() => ...factory(this.service)) rather
 * than issuing/caching HTTP calls themselves.
 */

// The profile can be edited elsewhere (another tab); a short stale
// window avoids a refetch on every route revisit while still picking
// up cross-tab edits reasonably quickly.
const PROFILE_STALE_TIME_MS = 60_000;

const ME_STALE_TIME_MS = 5 * 60_000;

// Province/district/local level/ward are static reference data - safe
// to treat as fresh, and to keep cached, for the entire browser session.
const LOCATIONS_STALE_TIME_MS = Infinity;

export function profileQueryOptions(coopProfileService: CoopProfileService) {
  return queryOptions({
    queryKey: coopQueryKeys.profile(),
    queryFn: () => firstValueFrom(coopProfileService.getProfile()),
    staleTime: PROFILE_STALE_TIME_MS
  });
}

export function meQueryOptions(coopProfileService: CoopProfileService) {
  return queryOptions({
    queryKey: coopQueryKeys.me(),
    queryFn: () => firstValueFrom(coopProfileService.getMe()),
    staleTime: ME_STALE_TIME_MS
  });
}

export function locationsQueryOptions(coopProfileService: CoopProfileService) {
  return queryOptions({
    queryKey: coopQueryKeys.locations(),
    queryFn: () => firstValueFrom(coopProfileService.getLocations()),
    staleTime: LOCATIONS_STALE_TIME_MS,
    gcTime: LOCATIONS_STALE_TIME_MS
  });
}
