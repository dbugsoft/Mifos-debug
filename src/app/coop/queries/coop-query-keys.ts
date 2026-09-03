/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { CoopAdminListParams } from '../services/coop-admin.service';

/*
 * Single source of truth for every Coop TanStack Query key.
 *
 * `admin.listRoot()` / `admin.root()` are exported separately from
 * `admin.list()` / `admin.detail()` so that mutations can invalidate
 * the whole list (any filter/page) or the whole admin subtree with
 * TanStack's prefix matching, without needing to know every concrete
 * key that has been cached.
 */
function normalizeListParams(params: CoopAdminListParams): {
  status: string;
  q: string;
  limit: number | null;
  offset: number | null;
} {
  return {
    status: params.status ?? '',
    q: params.q ?? '',
    limit: params.limit ?? null,
    offset: params.offset ?? null
  };
}

export const coopQueryKeys = {
  root: () => ['coop'] as const,

  profile: () => [
      ...coopQueryKeys.root(),
      'profile'
    ] as const,

  me: () => [
      ...coopQueryKeys.root(),
      'me'
    ] as const,

  locations: () => [
      ...coopQueryKeys.root(),
      'locations'
    ] as const,

  admin: {
    root: () => [
        ...coopQueryKeys.root(),
        'admin'
      ] as const,

    listRoot: () => [
        ...coopQueryKeys.admin.root(),
        'list'
      ] as const,

    list: (params: CoopAdminListParams) => [
        ...coopQueryKeys.admin.listRoot(),
        normalizeListParams(params)
      ] as const,

    detail: (id: number) => [
        ...coopQueryKeys.admin.root(),
        'detail',
        id
      ] as const,

    stats: () => [
        ...coopQueryKeys.admin.root(),
        'stats'
      ] as const
  }
};
