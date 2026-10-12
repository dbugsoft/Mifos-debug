/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/**
 * The "Service Center" rename/extension of Fineract offices (GH-224).
 *
 * Mirrors `GET/POST/PUT /nepal/service-centers`. Fineract's own office
 * endpoints, permissions and field names stay "office" - this is a
 * frontend-facing rename and an additive set of detail fields on top
 * of the same underlying office resource.
 */

export type ServiceCenterStatus = 'ACTIVE' | 'INACTIVE';

/** One row from `GET /nepal/service-centers` - also the shape of `GET /nepal/service-centers/{officeId}`. */
export interface ServiceCenter {
  id: number;
  name: string;
  parentId?: number;
  parentName?: string;
  hierarchy?: string;
  openingDate: string;
  externalId?: string;
  /** False for an office created before this feature - it has none of the fields below yet. */
  hasDetails: boolean;
  code?: string;
  status?: ServiceCenterStatus;
  address?: ServiceCenterAddress;
  /** Digits only, e.g. "014123456" - format for display if needed. */
  landline?: string;
  /** Digits only, e.g. "9841234567". */
  mobile?: string;
  workingArea?: string;
}

/** Same shape the member address form already uses for Nepal's administrative hierarchy. */
export interface ServiceCenterAddress {
  localLevelCode: string;
  provinceCode: string;
  provinceName: string;
  provinceNameNp?: string;
  districtKey: string;
  districtName: string;
  districtNameNp?: string;
  localLevelName: string;
  localLevelNameNp?: string;
  totalWard?: number;
  localLevelActive?: boolean;
  wardNo: number;
  tole?: string;
  houseNumber?: string;
}

/** `POST /nepal/service-centers`. */
export interface CreateServiceCenterRequest {
  name: string;
  parentId: number;
  openingDate: string;
  dateFormat: string;
  locale: string;
  externalId?: string;
  code: string;
  localLevelCode: string;
  wardNo: number;
  tole?: string;
  houseNumber?: string;
  landline?: string;
  mobile?: string;
  status?: ServiceCenterStatus;
  workingArea?: string;
}

/**
 * `PUT /nepal/service-centers/{officeId}`.
 *
 * Office fields are optional - only what is sent changes. Detail
 * fields are not: send all of them every time, since an omitted
 * optional one is cleared rather than left as-is.
 */
export interface UpdateServiceCenterRequest {
  name?: string;
  parentId?: number;
  openingDate?: string;
  dateFormat?: string;
  locale?: string;
  externalId?: string;
  code: string;
  localLevelCode: string;
  wardNo: number;
  tole?: string;
  houseNumber?: string;
  landline?: string;
  mobile?: string;
  status: ServiceCenterStatus;
  workingArea?: string;
}

export interface ServiceCenterApiErrorDetail {
  parameterName?: string;
  userMessageGlobalisationCode?: string;
  defaultUserMessage?: string;
}

export interface ServiceCenterApiError {
  httpStatusCode: string;
  errors: ServiceCenterApiErrorDetail[];
}
