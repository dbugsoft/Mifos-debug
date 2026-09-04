/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { firstValueFrom } from 'rxjs';
import { queryOptions } from '@tanstack/angular-query-experimental';

import { CoopAdminListParams, CoopAdminService } from '../services/coop-admin.service';
import { coopQueryKeys } from './coop-query-keys';

/*
 * Admin data can be changed by any admin at any time, so it is kept
 * fresher than the user's own profile. Mutations (verify/reject/
 * activate) still force an immediate update/invalidation on top of
 * this - see applyMutationResult() in coop-admin-detail.component.ts.
 */
const ADMIN_STALE_TIME_MS = 30_000;

export function adminListQueryOptions(coopAdminService: CoopAdminService, params: CoopAdminListParams) {
  return queryOptions({
    queryKey: coopQueryKeys.admin.list(params),
    queryFn: () => firstValueFrom(coopAdminService.getCooperatives(params)),
    staleTime: ADMIN_STALE_TIME_MS
  });
}

export function adminDetailQueryOptions(coopAdminService: CoopAdminService, id: number) {
  return queryOptions({
    queryKey: coopQueryKeys.admin.detail(id),
    queryFn: () => firstValueFrom(coopAdminService.getCooperativeById(id)),
    staleTime: ADMIN_STALE_TIME_MS,
    enabled: Number.isFinite(id)
  });
}

export function adminStatsQueryOptions(coopAdminService: CoopAdminService) {
  return queryOptions({
    queryKey: coopQueryKeys.admin.stats(),
    queryFn: () => firstValueFrom(coopAdminService.getStats()),
    staleTime: ADMIN_STALE_TIME_MS
  });
}
